import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class RedisService {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 50, 1000);
          }
        }
      };

      // Create main client
      this.client = createClient(redisConfig);
      
      // Create publisher client
      this.publisher = createClient(redisConfig);
      
      // Create subscriber client
      this.subscriber = createClient(redisConfig);

      // Set up error handlers
      this.client.on('error', (err) => console.error('Redis Client Error:', err));
      this.publisher.on('error', (err) => console.error('Redis Publisher Error:', err));
      this.subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      this.isConnected = true;
      console.log('✅ Worker Redis connected successfully');
    } catch (error) {
      console.error('❌ Worker Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) await this.client.quit();
      if (this.publisher) await this.publisher.quit();
      if (this.subscriber) await this.subscriber.quit();
      
      this.isConnected = false;
      console.log('✅ Worker Redis disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
    }
  }

  // Publish message updates to gateway
  async publishMessageUpdate(data) {
    try {
      await this.publisher.publish('message_updates', JSON.stringify(data));
    } catch (error) {
      console.error('Error publishing message update:', error);
    }
  }

  // Publish presence updates
  async publishPresenceUpdate(data) {
    try {
      await this.publisher.publish('presence_updates', JSON.stringify(data));
    } catch (error) {
      console.error('Error publishing presence update:', error);
    }
  }

  // Publish group updates
  async publishGroupUpdate(data) {
    try {
      await this.publisher.publish('group_updates', JSON.stringify(data));
    } catch (error) {
      console.error('Error publishing group update:', error);
    }
  }

  // Publish notification updates
  async publishNotificationUpdate(data) {
    try {
      await this.publisher.publish('notification_updates', JSON.stringify(data));
    } catch (error) {
      console.error('Error publishing notification update:', error);
    }
  }

  // Cache message for quick retrieval
  async cacheMessage(messageId, messageData, ttl = 3600) {
    try {
      const key = `message:${messageId}`;
      await this.client.setEx(key, ttl, JSON.stringify(messageData));
    } catch (error) {
      console.error('Error caching message:', error);
    }
  }

  // Get cached message
  async getCachedMessage(messageId) {
    try {
      const key = `message:${messageId}`;
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached message:', error);
      return null;
    }
  }

  // Update user online status
  async setUserOnline(userId, socketId = null) {
    try {
      const multi = this.client.multi();
      
      // Set user as online
      multi.hSet(`user:${userId}:status`, {
        isOnline: 'true',
        lastSeen: new Date().toISOString()
      });
      
      // Add to online users set
      multi.sAdd('online_users', userId);
      
      // Set socket mapping if provided
      if (socketId) {
        multi.hSet(`user:${userId}:sockets`, socketId, new Date().toISOString());
        multi.set(`socket:${socketId}:user`, userId);
      }
      
      await multi.exec();
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }

  // Update user offline status
  async setUserOffline(userId, socketId = null) {
    try {
      const multi = this.client.multi();
      
      // Update user status
      multi.hSet(`user:${userId}:status`, {
        isOnline: 'false',
        lastSeen: new Date().toISOString()
      });
      
      // Remove from online users set
      multi.sRem('online_users', userId);
      
      // Remove socket mapping if provided
      if (socketId) {
        multi.hDel(`user:${userId}:sockets`, socketId);
        multi.del(`socket:${socketId}:user`);
      }
      
      await multi.exec();
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  // Get user online status
  async getUserStatus(userId) {
    try {
      const status = await this.client.hGetAll(`user:${userId}:status`);
      return {
        isOnline: status.isOnline === 'true',
        lastSeen: status.lastSeen ? new Date(status.lastSeen) : null
      };
    } catch (error) {
      console.error('Error getting user status:', error);
      return { isOnline: false, lastSeen: null };
    }
  }

  // Get online users
  async getOnlineUsers() {
    try {
      return await this.client.sMembers('online_users');
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  // Cache conversation for quick access
  async cacheConversation(conversationKey, messages, ttl = 1800) {
    try {
      const key = `conversation:${conversationKey}`;
      await this.client.setEx(key, ttl, JSON.stringify(messages));
    } catch (error) {
      console.error('Error caching conversation:', error);
    }
  }

  // Get cached conversation
  async getCachedConversation(conversationKey) {
    try {
      const key = `conversation:${conversationKey}`;
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached conversation:', error);
      return null;
    }
  }

  // Invalidate conversation cache
  async invalidateConversationCache(conversationKey) {
    try {
      const key = `conversation:${conversationKey}`;
      await this.client.del(key);
    } catch (error) {
      console.error('Error invalidating conversation cache:', error);
    }
  }

  // Store message delivery status
  async setMessageDeliveryStatus(messageId, userId, status) {
    try {
      const key = `message:${messageId}:status`;
      await this.client.hSet(key, userId, JSON.stringify({
        status,
        timestamp: new Date().toISOString()
      }));
      
      // Set expiration for cleanup
      await this.client.expire(key, 86400); // 24 hours
    } catch (error) {
      console.error('Error setting message delivery status:', error);
    }
  }

  // Get message delivery status
  async getMessageDeliveryStatus(messageId) {
    try {
      const key = `message:${messageId}:status`;
      const statuses = await this.client.hGetAll(key);
      
      const result = {};
      for (const [userId, statusData] of Object.entries(statuses)) {
        result[userId] = JSON.parse(statusData);
      }
      
      return result;
    } catch (error) {
      console.error('Error getting message delivery status:', error);
      return {};
    }
  }

  // Store typing indicator
  async setTyping(userId, targetId, isGroup = false) {
    try {
      const key = isGroup ? `typing:group:${targetId}` : `typing:user:${targetId}`;
      await this.client.hSet(key, userId, new Date().toISOString());
      await this.client.expire(key, 10); // Auto-expire after 10 seconds
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }

  // Remove typing indicator
  async removeTyping(userId, targetId, isGroup = false) {
    try {
      const key = isGroup ? `typing:group:${targetId}` : `typing:user:${targetId}`;
      await this.client.hDel(key, userId);
    } catch (error) {
      console.error('Error removing typing indicator:', error);
    }
  }

  // Get typing users
  async getTypingUsers(targetId, isGroup = false) {
    try {
      const key = isGroup ? `typing:group:${targetId}` : `typing:user:${targetId}`;
      const typingData = await this.client.hGetAll(key);
      
      const now = new Date();
      const validTyping = [];
      
      for (const [userId, timestamp] of Object.entries(typingData)) {
        const typingTime = new Date(timestamp);
        // Consider typing valid if within last 10 seconds
        if (now - typingTime < 10000) {
          validTyping.push(userId);
        } else {
          // Clean up expired typing indicators
          await this.client.hDel(key, userId);
        }
      }
      
      return validTyping;
    } catch (error) {
      console.error('Error getting typing users:', error);
      return [];
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Get Redis info
  async getInfo() {
    try {
      return {
        connected: this.isConnected,
        memory: await this.client.memory('usage'),
        keyspace: await this.client.info('keyspace')
      };
    } catch (error) {
      console.error('Error getting Redis info:', error);
      return { connected: false };
    }
  }
}

export const redisService = new RedisService();