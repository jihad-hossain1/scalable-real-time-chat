import { db, notifications, users } from '../models/db.js';
import { redisService } from '../services/redis.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

class NotificationProcessor {
  constructor() {
    this.processingStats = {
      processed: 0,
      failed: 0,
      startTime: new Date()
    };
  }

  async processNotification(notificationData, rabbitMsg) {
    try {
      const { type = 'CREATE_NOTIFICATION', ...data } = notificationData;
      
      console.log(`🔔 Processing notification type: ${type}`);
      
      switch (type) {
        case 'CREATE_NOTIFICATION':
          await this.handleCreateNotification(data);
          break;
        case 'MARK_READ':
          await this.handleMarkRead(data);
          break;
        case 'MARK_ALL_READ':
          await this.handleMarkAllRead(data);
          break;
        case 'DELETE_NOTIFICATION':
          await this.handleDeleteNotification(data);
          break;
        default:
          console.warn(`⚠️ Unknown notification type: ${type}`);
      }
      
      this.processingStats.processed++;
    } catch (error) {
      this.processingStats.failed++;
      console.error('❌ Error processing notification:', error);
      throw error;
    }
  }

  async handleCreateNotification(data) {
    const {
      userId,
      title,
      message,
      notificationType,
      data: notificationData = null,
      priority = 'normal'
    } = data;

    try {
      // Validate required fields
      if (!userId || !title || !message || !notificationType) {
        throw new Error('Missing required fields: userId, title, message, notificationType');
      }

      // Verify user exists
      const user = await db.select({
        id: users.id,
        username: users.username,
        isActive: users.isActive
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

      if (user.length === 0) {
        throw new Error('User not found');
      }

      if (!user[0].isActive) {
        console.log(`⚠️ Skipping notification for inactive user: ${userId}`);
        return;
      }

      // Check for duplicate notifications (prevent spam)
      const recentNotifications = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.type, notificationType),
          eq(notifications.title, title)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      // If there's a recent identical notification within 5 minutes, skip
      if (recentNotifications.length > 0) {
        const timeDiff = new Date() - new Date(recentNotifications[0].createdAt);
        if (timeDiff < 5 * 60 * 1000) { // 5 minutes
          console.log(`⚠️ Skipping duplicate notification for user: ${userId}`);
          return;
        }
      }

      // Create the notification
      const notificationId = uuidv4();
      const now = new Date();

      const newNotification = await db.insert(notifications).values({
        id: notificationId,
        userId,
        title,
        message,
        type: notificationType,
        data: notificationData ? JSON.stringify(notificationData) : null,
        isRead: false,
        createdAt: now
      }).returning();

      const savedNotification = newNotification[0];

      // Cache notification for quick access
      await this.cacheNotification(notificationId, savedNotification);

      // Update user's unread notification count
      await this.updateUnreadCount(userId);

      // Publish notification to Redis for real-time delivery
      await redisService.publishNotificationUpdate({
        type: 'NEW_NOTIFICATION',
        notificationData: {
          ...savedNotification,
          data: notificationData
        },
        userId,
        priority
      });

      console.log(`✅ Notification created and published: ${notificationId}`);
      return savedNotification;

    } catch (error) {
      console.error('❌ Error handling create notification:', error);
      throw error;
    }
  }

  async handleMarkRead(data) {
    const { notificationId, userId } = data;

    try {
      // Verify notification exists and belongs to user
      const existingNotification = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ))
        .limit(1);

      if (existingNotification.length === 0) {
        console.log(`⚠️ Notification not found or already read: ${notificationId}`);
        return;
      }

      // Mark as read
      const updatedNotification = await db.update(notifications)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(eq(notifications.id, notificationId))
        .returning();

      // Update cache
      await this.cacheNotification(notificationId, updatedNotification[0]);

      // Update user's unread notification count
      await this.updateUnreadCount(userId);

      // Publish update
      await redisService.publishNotificationUpdate({
        type: 'NOTIFICATION_READ',
        notificationData: updatedNotification[0],
        userId
      });

      console.log(`✅ Notification marked as read: ${notificationId}`);
      return updatedNotification[0];

    } catch (error) {
      console.error('❌ Error handling mark read:', error);
      throw error;
    }
  }

  async handleMarkAllRead(data) {
    const { userId } = data;

    try {
      // Mark all unread notifications as read
      const updatedNotifications = await db.update(notifications)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ))
        .returning();

      // Clear unread count cache
      await redisService.client.del(`unread_notifications:${userId}`);

      // Publish update
      await redisService.publishNotificationUpdate({
        type: 'ALL_NOTIFICATIONS_READ',
        userId,
        count: updatedNotifications.length
      });

      console.log(`✅ Marked ${updatedNotifications.length} notifications as read for user: ${userId}`);
      return updatedNotifications;

    } catch (error) {
      console.error('❌ Error handling mark all read:', error);
      throw error;
    }
  }

  async handleDeleteNotification(data) {
    const { notificationId, userId } = data;

    try {
      // Verify notification exists and belongs to user
      const existingNotification = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .limit(1);

      if (existingNotification.length === 0) {
        throw new Error('Notification not found or unauthorized');
      }

      // Delete the notification
      await db.delete(notifications)
        .where(eq(notifications.id, notificationId));

      // Remove from cache
      await redisService.client.del(`notification:${notificationId}`);

      // Update user's unread notification count if it was unread
      if (!existingNotification[0].isRead) {
        await this.updateUnreadCount(userId);
      }

      // Publish update
      await redisService.publishNotificationUpdate({
        type: 'NOTIFICATION_DELETED',
        notificationId,
        userId
      });

      console.log(`✅ Notification deleted: ${notificationId}`);

    } catch (error) {
      console.error('❌ Error handling delete notification:', error);
      throw error;
    }
  }

  // Helper method to cache notification
  async cacheNotification(notificationId, notificationData, ttl = 3600) {
    try {
      const key = `notification:${notificationId}`;
      await redisService.client.setEx(key, ttl, JSON.stringify(notificationData));
    } catch (error) {
      console.error('Error caching notification:', error);
    }
  }

  // Helper method to update unread notification count
  async updateUnreadCount(userId) {
    try {
      const unreadCount = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      const count = unreadCount.length;
      
      // Cache the count
      const key = `unread_notifications:${userId}`;
      await redisService.client.setEx(key, 3600, count.toString());

      // Publish count update
      await redisService.publishNotificationUpdate({
        type: 'UNREAD_COUNT_UPDATE',
        userId,
        count
      });

      return count;
    } catch (error) {
      console.error('Error updating unread count:', error);
      return 0;
    }
  }

  // Create notification for new message
  async createMessageNotification(messageData) {
    const { senderId, recipientId, groupId, content, senderName } = messageData;

    try {
      if (groupId) {
        // Get group members (excluding sender)
        const members = await db.select({
          userId: groupMembers.userId
        })
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, groupId),
          ne(groupMembers.userId, senderId)
        ));

        // Create notification for each member
        for (const member of members) {
          await this.handleCreateNotification({
            userId: member.userId,
            title: `New message in group`,
            message: `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
            notificationType: 'message',
            data: {
              messageId: messageData.id,
              senderId,
              groupId,
              type: 'group_message'
            }
          });
        }
      } else if (recipientId) {
        // Create notification for direct message recipient
        await this.handleCreateNotification({
          userId: recipientId,
          title: `New message from ${senderName}`,
          message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          notificationType: 'message',
          data: {
            messageId: messageData.id,
            senderId,
            type: 'direct_message'
          }
        });
      }
    } catch (error) {
      console.error('Error creating message notification:', error);
    }
  }

  // Create notification for group events
  async createGroupNotification(eventData) {
    const { type, groupId, groupName, actorId, actorName, targetUserId, targetUserName } = eventData;

    try {
      let title, message, notificationData;

      switch (type) {
        case 'MEMBER_ADDED':
          title = `Added to group`;
          message = `${actorName} added you to ${groupName}`;
          notificationData = {
            groupId,
            actorId,
            type: 'group_member_added'
          };
          
          // Notify the added user
          if (targetUserId) {
            await this.handleCreateNotification({
              userId: targetUserId,
              title,
              message,
              notificationType: 'group_invite',
              data: notificationData
            });
          }
          break;

        case 'MEMBER_REMOVED':
          title = `Removed from group`;
          message = `You were removed from ${groupName}`;
          notificationData = {
            groupId,
            actorId,
            type: 'group_member_removed'
          };
          
          // Notify the removed user
          if (targetUserId) {
            await this.handleCreateNotification({
              userId: targetUserId,
              title,
              message,
              notificationType: 'group_update',
              data: notificationData
            });
          }
          break;

        case 'GROUP_UPDATED':
          title = `Group updated`;
          message = `${actorName} updated ${groupName}`;
          notificationData = {
            groupId,
            actorId,
            type: 'group_updated'
          };
          
          // Notify all group members except the actor
          const members = await db.select({
            userId: groupMembers.userId
          })
          .from(groupMembers)
          .where(and(
            eq(groupMembers.groupId, groupId),
            ne(groupMembers.userId, actorId)
          ));

          for (const member of members) {
            await this.handleCreateNotification({
              userId: member.userId,
              title,
              message,
              notificationType: 'group_update',
              data: notificationData
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error creating group notification:', error);
    }
  }

  // Get processing statistics
  getStats() {
    const uptime = new Date() - this.processingStats.startTime;
    return {
      ...this.processingStats,
      uptime: Math.floor(uptime / 1000), // in seconds
      rate: this.processingStats.processed / (uptime / 1000 / 60) // notifications per minute
    };
  }

  // Reset statistics
  resetStats() {
    this.processingStats = {
      processed: 0,
      failed: 0,
      startTime: new Date()
    };
  }
}

export const notificationProcessor = new NotificationProcessor();