import { db, notifications, users } from '../models/db.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { rabbitmqService } from '../services/rabbitmq.js';
import { redisService } from '../services/redis.js';

class NotificationController {
  // Get notifications for a user
  async getNotifications(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 20, filter = {} } = req.query;
      const offset = (page - 1) * limit;

      // Build where conditions
      let whereConditions = [eq(notifications.userId, userId)];

      // Apply filters
      if (filter.status && filter.status !== 'all') {
        if (filter.status === 'unread') {
          whereConditions.push(eq(notifications.isRead, false));
        } else if (filter.status === 'read') {
          whereConditions.push(eq(notifications.isRead, true));
        }
      }

      if (filter.type && filter.type !== 'all') {
        whereConditions.push(eq(notifications.type, filter.type));
      }

      // Get notifications with pagination
      const notificationsList = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          content: notifications.content,
          data: notifications.data,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(parseInt(limit))
        .offset(offset);

      // Get total count for pagination
      const totalResult = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(...whereConditions));

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Parse JSON data field
      const parsedNotifications = notificationsList.map(notification => ({
        ...notification,
        data: notification.data ? JSON.parse(notification.data) : null
      }));

      res.json({
        success: true,
        data: {
          notifications: parsedNotifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('❌ Get notifications failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notifications',
        code: 'GET_NOTIFICATIONS_FAILED'
      });
    }
  }

  // Get notification by ID
  async getNotificationById(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.userId;

      const notification = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .limit(1);

      if (notification.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOTIFICATION_NOT_FOUND'
        });
      }

      // Parse JSON data field
      const parsedNotification = {
        ...notification[0],
        data: notification[0].data ? JSON.parse(notification[0].data) : null
      };

      res.json({
        success: true,
        data: parsedNotification
      });
    } catch (error) {
      console.error('❌ Get notification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notification',
        code: 'GET_NOTIFICATION_FAILED'
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.userId;

      // Check if notification exists and belongs to user
      const notification = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .limit(1);

      if (notification.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOTIFICATION_NOT_FOUND'
        });
      }

      // Update notification as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));

      // Publish notification update
      await rabbitmqService.publishNotificationUpdate({
        userId,
        notificationId,
        action: 'mark_read'
      });

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('❌ Mark notification as read failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
        code: 'MARK_READ_FAILED'
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.userId;

      // Update all unread notifications as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      // Publish notification update
      await rabbitmqService.publishNotificationUpdate({
        userId,
        action: 'mark_all_read'
      });

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('❌ Mark all notifications as read failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read',
        code: 'MARK_ALL_READ_FAILED'
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.userId;

      // Check if notification exists and belongs to user
      const notification = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .limit(1);

      if (notification.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOTIFICATION_NOT_FOUND'
        });
      }

      // Delete notification
      await db
        .delete(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));

      // Publish notification update
      await rabbitmqService.publishNotificationUpdate({
        userId,
        notificationId,
        action: 'delete'
      });

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete notification failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
        code: 'DELETE_NOTIFICATION_FAILED'
      });
    }
  }

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const userId = req.userId;

      const result = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      const unreadCount = result[0]?.count || 0;

      res.json({
        success: true,
        data: { unreadCount }
      });
    } catch (error) {
      console.error('❌ Get unread count failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get unread count',
        code: 'GET_UNREAD_COUNT_FAILED'
      });
    }
  }

  // Create notification (internal use)
  async createNotification(userId, type, title, content, data = null) {
    try {
      const notification = await db
        .insert(notifications)
        .values({
          userId,
          type,
          title,
          content,
          data: data ? JSON.stringify(data) : null,
          isRead: false
        })
        .returning();

      // Publish notification to RabbitMQ for real-time delivery
      await rabbitmqService.publishNotification({
        userId,
        notification: {
          ...notification[0],
          data: data
        }
      });

      return notification[0];
    } catch (error) {
      console.error('❌ Create notification failed:', error);
      throw error;
    }
  }
}

export const notificationController = new NotificationController();
export { NotificationController };