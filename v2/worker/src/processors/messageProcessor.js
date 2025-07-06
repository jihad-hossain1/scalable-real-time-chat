import { db, messages, messageStatus, users, groups, groupMembers } from '../models/db.js';
import { redisService } from '../services/redis.js';
import { eq, and, or, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

class MessageProcessor {
  constructor() {
    this.processingStats = {
      processed: 0,
      failed: 0,
      startTime: new Date()
    };
  }

  async processMessage(messageData, rabbitMsg) {
    try {
      const { type = 'NEW_MESSAGE', ...data } = messageData;
      
      console.log(`🔄 Processing message type: ${type}`);
      
      switch (type) {
        case 'NEW_MESSAGE':
          await this.handleNewMessage(data);
          break;
        case 'EDIT_MESSAGE':
          await this.handleEditMessage(data);
          break;
        case 'DELETE_MESSAGE':
          await this.handleDeleteMessage(data);
          break;
        case 'MESSAGE_STATUS':
          await this.handleMessageStatus(data);
          break;
        default:
          console.warn(`⚠️ Unknown message type: ${type}`);
      }
      
      this.processingStats.processed++;
    } catch (error) {
      this.processingStats.failed++;
      console.error('❌ Error processing message:', error);
      throw error;
    }
  }

  async handleNewMessage(data) {
    const {
      content,
      senderId,
      recipientId,
      groupId,
      messageType = 'text',
      fileUrl,
      fileName,
      fileSize,
      replyToId,
      socketId
    } = data;

    try {
      // Validate required fields
      if (!content || !senderId) {
        throw new Error('Missing required fields: content, senderId');
      }

      if (!recipientId && !groupId) {
        throw new Error('Either recipientId or groupId must be provided');
      }

      // Verify sender exists
      const sender = await db.select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar
      })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);

      if (sender.length === 0) {
        throw new Error('Sender not found');
      }

      // Validate recipient or group
      let recipient = null;
      let group = null;
      let groupMembers = [];

      if (recipientId) {
        const recipientResult = await db.select({
          id: users.id,
          username: users.username,
          isActive: users.isActive
        })
        .from(users)
        .where(eq(users.id, recipientId))
        .limit(1);

        if (recipientResult.length === 0) {
          throw new Error('Recipient not found');
        }

        recipient = recipientResult[0];
        
        if (!recipient.isActive) {
          throw new Error('Recipient account is inactive');
        }
      }

      if (groupId) {
        // Verify group exists
        const groupResult = await db.select({
          id: groups.id,
          name: groups.name,
          isPrivate: groups.isPrivate
        })
        .from(groups)
        .where(eq(groups.id, groupId))
        .limit(1);

        if (groupResult.length === 0) {
          throw new Error('Group not found');
        }

        group = groupResult[0];

        // Verify sender is a member of the group
        const membershipResult = await db.select({
          userId: groupMembers.userId,
          role: groupMembers.role
        })
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, senderId)
        ))
        .limit(1);

        if (membershipResult.length === 0) {
          throw new Error('Sender is not a member of the group');
        }

        // Get all group members for delivery status
        groupMembers = await db.select({
          userId: groupMembers.userId
        })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));
      }

      // Validate reply-to message if provided
      if (replyToId) {
        const replyToMessage = await db.select({ id: messages.id })
          .from(messages)
          .where(eq(messages.id, replyToId))
          .limit(1);

        if (replyToMessage.length === 0) {
          throw new Error('Reply-to message not found');
        }
      }

      // Create the message
      const messageId = uuidv4();
      const now = new Date();

      const newMessage = await db.insert(messages).values({
        id: messageId,
        content,
        senderId,
        recipientId,
        groupId,
        messageType,
        fileUrl,
        fileName,
        fileSize,
        replyToId,
        createdAt: now,
        updatedAt: now
      }).returning();

      const savedMessage = newMessage[0];

      // Create delivery status records
      const statusRecords = [];
      
      if (groupId && groupMembers.length > 0) {
        // For group messages, create status for all members except sender
        for (const member of groupMembers) {
          if (member.userId !== senderId) {
            statusRecords.push({
              id: uuidv4(),
              messageId,
              userId: member.userId,
              status: 'sent',
              timestamp: now
            });
          }
        }
      } else if (recipientId) {
        // For direct messages, create status for recipient
        statusRecords.push({
          id: uuidv4(),
          messageId,
          userId: recipientId,
          status: 'sent',
          timestamp: now
        });
      }

      if (statusRecords.length > 0) {
        await db.insert(messageStatus).values(statusRecords);
      }

      // Prepare message data for broadcasting
      const messageWithSender = {
        ...savedMessage,
        sender: sender[0],
        recipient: recipient,
        group: group,
        deliveryStatus: statusRecords.map(record => ({
          userId: record.userId,
          status: record.status,
          timestamp: record.timestamp
        }))
      };

      // Cache the message
      await redisService.cacheMessage(messageId, messageWithSender);

      // Invalidate conversation cache
      if (recipientId) {
        const conversationKey = this.getConversationKey(senderId, recipientId);
        await redisService.invalidateConversationCache(conversationKey);
      } else if (groupId) {
        await redisService.invalidateConversationCache(`group:${groupId}`);
      }

      // Publish message update to Redis for real-time delivery
      await redisService.publishMessageUpdate({
        type: 'NEW_MESSAGE',
        messageData: messageWithSender,
        recipientId,
        groupId,
        socketId
      });

      console.log(`✅ New message saved and published: ${messageId}`);
      return messageWithSender;

    } catch (error) {
      console.error('❌ Error handling new message:', error);
      throw error;
    }
  }

  async handleEditMessage(data) {
    const { messageId, senderId, newContent } = data;

    try {
      // Verify message exists and sender owns it
      const existingMessage = await db.select()
        .from(messages)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.senderId, senderId),
          eq(messages.isDeleted, false)
        ))
        .limit(1);

      if (existingMessage.length === 0) {
        throw new Error('Message not found or unauthorized');
      }

      const message = existingMessage[0];

      // Update the message
      const updatedMessage = await db.update(messages)
        .set({
          content: newContent,
          isEdited: true,
          editedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(messages.id, messageId))
        .returning();

      // Get sender info
      const sender = await db.select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar
      })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);

      const messageWithSender = {
        ...updatedMessage[0],
        sender: sender[0]
      };

      // Update cache
      await redisService.cacheMessage(messageId, messageWithSender);

      // Invalidate conversation cache
      if (message.recipientId) {
        const conversationKey = this.getConversationKey(senderId, message.recipientId);
        await redisService.invalidateConversationCache(conversationKey);
      } else if (message.groupId) {
        await redisService.invalidateConversationCache(`group:${message.groupId}`);
      }

      // Publish update
      await redisService.publishMessageUpdate({
        type: 'EDIT_MESSAGE',
        messageData: messageWithSender,
        recipientId: message.recipientId,
        groupId: message.groupId
      });

      console.log(`✅ Message edited: ${messageId}`);
      return messageWithSender;

    } catch (error) {
      console.error('❌ Error handling edit message:', error);
      throw error;
    }
  }

  async handleDeleteMessage(data) {
    const { messageId, senderId } = data;

    try {
      // Verify message exists and sender owns it
      const existingMessage = await db.select()
        .from(messages)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.senderId, senderId),
          eq(messages.isDeleted, false)
        ))
        .limit(1);

      if (existingMessage.length === 0) {
        throw new Error('Message not found or unauthorized');
      }

      const message = existingMessage[0];

      // Soft delete the message
      const deletedMessage = await db.update(messages)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(messages.id, messageId))
        .returning();

      // Remove from cache
      await redisService.client.del(`message:${messageId}`);

      // Invalidate conversation cache
      if (message.recipientId) {
        const conversationKey = this.getConversationKey(senderId, message.recipientId);
        await redisService.invalidateConversationCache(conversationKey);
      } else if (message.groupId) {
        await redisService.invalidateConversationCache(`group:${message.groupId}`);
      }

      // Publish update
      await redisService.publishMessageUpdate({
        type: 'DELETE_MESSAGE',
        messageData: deletedMessage[0],
        recipientId: message.recipientId,
        groupId: message.groupId
      });

      console.log(`✅ Message deleted: ${messageId}`);
      return deletedMessage[0];

    } catch (error) {
      console.error('❌ Error handling delete message:', error);
      throw error;
    }
  }

  async handleMessageStatus(data) {
    const { messageId, userId, status } = data;

    try {
      // Verify message exists
      const message = await db.select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (message.length === 0) {
        throw new Error('Message not found');
      }

      // Check if status record already exists
      const existingStatus = await db.select()
        .from(messageStatus)
        .where(and(
          eq(messageStatus.messageId, messageId),
          eq(messageStatus.userId, userId)
        ))
        .limit(1);

      const now = new Date();

      if (existingStatus.length > 0) {
        // Update existing status
        await db.update(messageStatus)
          .set({
            status,
            timestamp: now
          })
          .where(and(
            eq(messageStatus.messageId, messageId),
            eq(messageStatus.userId, userId)
          ));
      } else {
        // Create new status record
        await db.insert(messageStatus).values({
          id: uuidv4(),
          messageId,
          userId,
          status,
          timestamp: now
        });
      }

      // Update Redis delivery status
      await redisService.setMessageDeliveryStatus(messageId, userId, status);

      // Publish status update
      await redisService.publishMessageUpdate({
        type: 'MESSAGE_STATUS',
        messageData: {
          messageId,
          userId,
          status,
          timestamp: now
        },
        recipientId: message[0].recipientId,
        groupId: message[0].groupId
      });

      console.log(`✅ Message status updated: ${messageId} - ${status}`);

    } catch (error) {
      console.error('❌ Error handling message status:', error);
      throw error;
    }
  }

  // Helper method to generate conversation key
  getConversationKey(userId1, userId2) {
    // Sort IDs to ensure consistent key regardless of order
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}:${sortedIds[1]}`;
  }

  // Get processing statistics
  getStats() {
    const uptime = new Date() - this.processingStats.startTime;
    return {
      ...this.processingStats,
      uptime: Math.floor(uptime / 1000), // in seconds
      rate: this.processingStats.processed / (uptime / 1000 / 60) // messages per minute
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

export const messageProcessor = new MessageProcessor();