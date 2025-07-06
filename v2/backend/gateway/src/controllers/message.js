import { db, messages, messageStatus, users, groups, groupMembers } from '../models/db.js';
import { eq, and, or, desc, asc, gte, lte } from 'drizzle-orm';
import { validateBody } from '../middleware/auth.js';
import { rabbitmqService } from '../services/rabbitmq.js';
import { redisService } from '../services/redis.js';
import {
  sendMessageSchema,
  editMessageSchema,
  messageStatusSchema,
  paginationSchema
} from '../validation/schemas.js';

class MessageController {
  // Send a new message
  async sendMessage(req, res) {
    try {
      const { content, recipientId, groupId, messageType = 'text' } = req.body;
      const senderId = req.userId;
      
      // Validate that either recipientId or groupId is provided
      if (!recipientId && !groupId) {
        return res.status(400).json({
          success: false,
          error: 'Either recipientId or groupId must be provided',
          code: 'INVALID_RECIPIENT'
        });
      }
      
      // If it's a group message, verify user is a member
      if (groupId) {
        const membership = await db.select()
          .from(groupMembers)
          .where(and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, senderId)
          ))
          .limit(1);
        
        if (membership.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'You are not a member of this group',
            code: 'NOT_GROUP_MEMBER'
          });
        }
      }
      
      // If it's a direct message, verify recipient exists
      if (recipientId) {
        const recipient = await db.select()
          .from(users)
          .where(eq(users.id, recipientId))
          .limit(1);
        
        if (recipient.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Recipient not found',
            code: 'RECIPIENT_NOT_FOUND'
          });
        }
      }
      
      // Create the message
      const newMessage = await db.insert(messages).values({
        content,
        senderId,
        recipientId: recipientId || null,
        groupId: groupId || null,
        messageType
      }).returning();
      
      const message = newMessage[0];
      
      // Get sender info
      const sender = await db.select({
        id: users.id,
        username: users.username,
        avatar: users.avatar
      })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);
      
      const messageWithSender = {
        ...message,
        sender: sender[0]
      };
      
      // Cache the message in Redis
      await redisService.cacheMessage(message.id, messageWithSender);
      
      // Determine recipients for status tracking
      let recipientIds = [];
      if (groupId) {
        // Get all group members except sender
        const groupMembersList = await db.select({ userId: groupMembers.userId })
          .from(groupMembers)
          .where(and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, senderId, false) // Not equal to senderId
          ));
        recipientIds = groupMembersList.map(m => m.userId);
      } else {
        recipientIds = [recipientId];
      }
      
      // Create initial message status entries (sent)
      if (recipientIds.length > 0) {
        const statusEntries = recipientIds.map(userId => ({
          messageId: message.id,
          userId,
          status: 'sent'
        }));
        
        await db.insert(messageStatus).values(statusEntries);
      }
      
      // Publish message to RabbitMQ for processing
      await rabbitmqService.publishMessage({
        messageId: message.id,
        senderId,
        recipientId,
        groupId,
        content,
        messageType,
        recipientIds,
        messageData: messageWithSender
      });
      
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: messageWithSender
      });
    } catch (error) {
      console.error('Send message error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
        code: 'SEND_MESSAGE_ERROR'
      });
    }
  }
  
  // Get messages for a conversation (direct or group)
  async getMessages(req, res) {
    try {
      const { recipientId, groupId } = req.query;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.userId;
      
      if (!recipientId && !groupId) {
        return res.status(400).json({
          success: false,
          error: 'Either recipientId or groupId must be provided',
          code: 'INVALID_PARAMS'
        });
      }
      
      const offset = (page - 1) * limit;
      
      let whereCondition;
      
      if (groupId) {
        // Verify user is a member of the group
        const membership = await db.select()
          .from(groupMembers)
          .where(and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId)
          ))
          .limit(1);
        
        if (membership.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'You are not a member of this group',
            code: 'NOT_GROUP_MEMBER'
          });
        }
        
        whereCondition = eq(messages.groupId, groupId);
      } else {
        // Direct message conversation
        whereCondition = or(
          and(
            eq(messages.senderId, userId),
            eq(messages.recipientId, recipientId)
          ),
          and(
            eq(messages.senderId, recipientId),
            eq(messages.recipientId, userId)
          )
        );
      }
      
      // Get messages with sender info
      const conversationMessages = await db.select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        groupId: messages.groupId,
        messageType: messages.messageType,
        isEdited: messages.isEdited,
        editedAt: messages.editedAt,
        createdAt: messages.createdAt,
        senderUsername: users.username,
        senderAvatar: users.avatar
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(whereCondition)
      .orderBy(desc(messages.createdAt))
      .limit(parseInt(limit))
      .offset(offset);
      
      // Get message statuses for each message
      const messagesWithStatus = await Promise.all(
        conversationMessages.map(async (msg) => {
          const statuses = await db.select({
            userId: messageStatus.userId,
            status: messageStatus.status,
            timestamp: messageStatus.timestamp
          })
          .from(messageStatus)
          .where(eq(messageStatus.messageId, msg.id));
          
          return {
            ...msg,
            sender: {
              id: msg.senderId,
              username: msg.senderUsername,
              avatar: msg.senderAvatar
            },
            statuses
          };
        })
      );
      
      // Reverse to show oldest first
      messagesWithStatus.reverse();
      
      res.json({
        success: true,
        data: messagesWithStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: conversationMessages.length === parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get messages error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get messages',
        code: 'GET_MESSAGES_ERROR'
      });
    }
  }
  
  // Get user's conversations
  async getConversations(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 20 } = req.query;
      
      // Get direct conversations
      const directConversations = await db.select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        otherUserId: users.id,
        otherUsername: users.username,
        otherAvatar: users.avatar,
        otherIsOnline: users.isOnline,
        otherLastSeen: users.lastSeen
      })
      .from(messages)
      .innerJoin(users, or(
        and(eq(messages.senderId, userId), eq(users.id, messages.recipientId)),
        and(eq(messages.recipientId, userId), eq(users.id, messages.senderId))
      ))
      .where(or(
        eq(messages.senderId, userId),
        eq(messages.recipientId, userId)
      ))
      .orderBy(desc(messages.createdAt));
      
      // Group by conversation partner and get latest message
      const directConversationMap = new Map();
      directConversations.forEach(msg => {
        const partnerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
        if (!directConversationMap.has(partnerId)) {
          directConversationMap.set(partnerId, {
            type: 'direct',
            id: partnerId,
            name: msg.otherUsername,
            avatar: msg.otherAvatar,
            isOnline: msg.otherIsOnline,
            lastSeen: msg.otherLastSeen,
            lastMessage: {
              id: msg.id,
              content: msg.content,
              senderId: msg.senderId,
              messageType: msg.messageType,
              createdAt: msg.createdAt
            }
          });
        }
      });
      
      // Get group conversations
      const groupConversations = await db.select({
        groupId: groups.id,
        groupName: groups.name,
        groupAvatar: groups.avatar,
        groupCreatedAt: groups.createdAt,
        lastMessageId: messages.id,
        lastMessageContent: messages.content,
        lastMessageSenderId: messages.senderId,
        lastMessageType: messages.messageType,
        lastMessageCreatedAt: messages.createdAt,
        lastMessageSenderUsername: users.username
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .leftJoin(messages, eq(messages.groupId, groups.id))
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(groupMembers.userId, userId))
      .orderBy(desc(messages.createdAt));
      
      // Group by group ID and get latest message
      const groupConversationMap = new Map();
      groupConversations.forEach(conv => {
        if (!groupConversationMap.has(conv.groupId)) {
          groupConversationMap.set(conv.groupId, {
            type: 'group',
            id: conv.groupId,
            name: conv.groupName,
            avatar: conv.groupAvatar,
            createdAt: conv.groupCreatedAt,
            lastMessage: conv.lastMessageId ? {
              id: conv.lastMessageId,
              content: conv.lastMessageContent,
              senderId: conv.lastMessageSenderId,
              senderUsername: conv.lastMessageSenderUsername,
              messageType: conv.lastMessageType,
              createdAt: conv.lastMessageCreatedAt
            } : null
          });
        }
      });
      
      // Combine and sort conversations
      const allConversations = [
        ...Array.from(directConversationMap.values()),
        ...Array.from(groupConversationMap.values())
      ];
      
      // Sort by last message time
      allConversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt || new Date(0);
        const bTime = b.lastMessage?.createdAt || b.createdAt || new Date(0);
        return new Date(bTime) - new Date(aTime);
      });
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedConversations = allConversations.slice(offset, offset + parseInt(limit));
      
      // Get online status for direct conversations
      const conversationsWithStatus = await Promise.all(
        paginatedConversations.map(async (conv) => {
          if (conv.type === 'direct') {
            const userStatus = await redisService.getUserStatus(conv.id);
            return {
              ...conv,
              socketStatus: userStatus.status || 'offline'
            };
          }
          return conv;
        })
      );
      
      res.json({
        success: true,
        data: conversationsWithStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allConversations.length,
          hasMore: offset + parseInt(limit) < allConversations.length
        }
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get conversations',
        code: 'GET_CONVERSATIONS_ERROR'
      });
    }
  }
  
  // Edit a message
  async editMessage(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.userId;
      
      // Check if message exists and user is the sender
      const message = await db.select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);
      
      if (message.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'MESSAGE_NOT_FOUND'
        });
      }
      
      if (message[0].senderId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only edit your own messages',
          code: 'ACCESS_DENIED'
        });
      }
      
      // Check if message is too old to edit (e.g., 24 hours)
      const messageAge = Date.now() - new Date(message[0].createdAt).getTime();
      const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (messageAge > maxEditAge) {
        return res.status(400).json({
          success: false,
          error: 'Message is too old to edit',
          code: 'MESSAGE_TOO_OLD'
        });
      }
      
      // Update the message
      const updatedMessage = await db.update(messages)
        .set({
          content,
          isEdited: true,
          editedAt: new Date()
        })
        .where(eq(messages.id, id))
        .returning();
      
      // Get sender info
      const sender = await db.select({
        id: users.id,
        username: users.username,
        avatar: users.avatar
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
      const messageWithSender = {
        ...updatedMessage[0],
        sender: sender[0]
      };
      
      // Update cache
      await redisService.cacheMessage(id, messageWithSender);
      
      // Publish message edit event
      await rabbitmqService.publishMessage({
        type: 'MESSAGE_EDITED',
        messageId: id,
        senderId: userId,
        recipientId: message[0].recipientId,
        groupId: message[0].groupId,
        newContent: content,
        messageData: messageWithSender
      });
      
      res.json({
        success: true,
        message: 'Message edited successfully',
        data: messageWithSender
      });
    } catch (error) {
      console.error('Edit message error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to edit message',
        code: 'EDIT_MESSAGE_ERROR'
      });
    }
  }
  
  // Delete a message
  async deleteMessage(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      
      // Check if message exists and user is the sender
      const message = await db.select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);
      
      if (message.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'MESSAGE_NOT_FOUND'
        });
      }
      
      if (message[0].senderId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own messages',
          code: 'ACCESS_DENIED'
        });
      }
      
      // Delete the message (cascade will handle message status)
      await db.delete(messages).where(eq(messages.id, id));
      
      // Remove from cache
      await redisService.client.del(`message:${id}`);
      
      // Publish message deletion event
      await rabbitmqService.publishMessage({
        type: 'MESSAGE_DELETED',
        messageId: id,
        senderId: userId,
        recipientId: message[0].recipientId,
        groupId: message[0].groupId
      });
      
      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Delete message error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete message',
        code: 'DELETE_MESSAGE_ERROR'
      });
    }
  }
  
  // Update message status (delivered/read)
  async updateMessageStatus(req, res) {
    try {
      const { messageId, status } = req.body;
      const userId = req.userId;
      
      // Check if message exists
      const message = await db.select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      if (message.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          code: 'MESSAGE_NOT_FOUND'
        });
      }
      
      // Check if user is a valid recipient
      const isValidRecipient = message[0].recipientId === userId || 
        (message[0].groupId && await this.isGroupMember(message[0].groupId, userId));
      
      if (!isValidRecipient) {
        return res.status(403).json({
          success: false,
          error: 'You are not a recipient of this message',
          code: 'ACCESS_DENIED'
        });
      }
      
      // Update or create message status
      const existingStatus = await db.select()
        .from(messageStatus)
        .where(and(
          eq(messageStatus.messageId, messageId),
          eq(messageStatus.userId, userId)
        ))
        .limit(1);
      
      if (existingStatus.length > 0) {
        // Update existing status
        await db.update(messageStatus)
          .set({
            status,
            timestamp: new Date()
          })
          .where(and(
            eq(messageStatus.messageId, messageId),
            eq(messageStatus.userId, userId)
          ));
      } else {
        // Create new status
        await db.insert(messageStatus).values({
          messageId,
          userId,
          status
        });
      }
      
      // Publish status update
      await rabbitmqService.publishMessageStatus({
        messageId,
        userId,
        status,
        senderId: message[0].senderId,
        recipientId: message[0].recipientId,
        groupId: message[0].groupId
      });
      
      res.json({
        success: true,
        message: 'Message status updated successfully'
      });
    } catch (error) {
      console.error('Update message status error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update message status',
        code: 'UPDATE_STATUS_ERROR'
      });
    }
  }
  
  // Helper method to check if user is a group member
  async isGroupMember(groupId, userId) {
    try {
      const membership = await db.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        ))
        .limit(1);
      
      return membership.length > 0;
    } catch (error) {
      return false;
    }
  }
}

export const messageController = new MessageController();

// Export route handlers with validation
export const messageRoutes = {
  sendMessage: [validateBody(sendMessageSchema), messageController.sendMessage.bind(messageController)],
  getMessages: messageController.getMessages.bind(messageController),
  getConversations: messageController.getConversations.bind(messageController),
  editMessage: [validateBody(editMessageSchema), messageController.editMessage.bind(messageController)],
  deleteMessage: messageController.deleteMessage.bind(messageController),
  updateMessageStatus: [validateBody(messageStatusSchema), messageController.updateMessageStatus.bind(messageController)]
};