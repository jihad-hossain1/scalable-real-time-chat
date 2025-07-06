import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

class RedisService {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      // Main client for general operations
      this.client = createClient({ url: redisUrl });
      await this.client.connect();

      // Publisher client for pub/sub
      this.publisher = createClient({ url: redisUrl });
      await this.publisher.connect();

      // Subscriber client for pub/sub
      this.subscriber = createClient({ url: redisUrl });
      await this.subscriber.connect();

      console.log("✅ Redis connected successfully");
    } catch (error) {
      console.error("❌ Redis connection failed:", error.message);
      throw error;
    }
  }

  // User presence management
  async setUserOnline(userId, socketId) {
    await this.client.hSet(`user:${userId}`, {
      status: "online",
      socketId,
      lastSeen: Date.now(),
    });
    await this.client.sAdd("online_users", userId);
  }

  async setUserOffline(userId) {
    await this.client.hSet(`user:${userId}`, {
      status: "offline",
      lastSeen: Date.now(),
    });
    await this.client.sRem("online_users", userId);
    await this.client.hDel(`user:${userId}`, "socketId");
  }

  async getUserStatus(userId) {
    return await this.client.hGetAll(`user:${userId}`);
  }

  async getOnlineUsers() {
    return await this.client.sMembers("online_users");
  }

  async getUserSocketId(userId) {
    return await this.client.hGet(`user:${userId}`, "socketId");
  }

  // Typing indicators
  async setTyping(userId, chatId, isGroup = false) {
    const key = isGroup ? `typing:group:${chatId}` : `typing:chat:${chatId}`;
    if (isGroup) {
      await this.client.sAdd(key, userId);
    } else {
      await this.client.set(key, userId, { EX: 5 }); // Expires in 5 seconds
    }
  }

  async removeTyping(userId, chatId, isGroup = false) {
    const key = isGroup ? `typing:group:${chatId}` : `typing:chat:${chatId}`;
    if (isGroup) {
      await this.client.sRem(key, userId);
    } else {
      await this.client.del(key);
    }
  }

  async getTypingUsers(chatId, isGroup = false) {
    const key = isGroup ? `typing:group:${chatId}` : `typing:chat:${chatId}`;
    if (isGroup) {
      return await this.client.sMembers(key);
    } else {
      const user = await this.client.get(key);
      return user ? [user] : [];
    }
  }

  // Message caching
  async cacheMessage(messageId, messageData) {
    await this.client.setEx(
      `message:${messageId}`,
      3600,
      JSON.stringify(messageData)
    );
  }

  async getCachedMessage(messageId) {
    const data = await this.client.get(`message:${messageId}`);
    return data ? JSON.parse(data) : null;
  }

  // Pub/Sub for real-time updates
  async publishMessage(channel, data) {
    await this.publisher.publish(channel, JSON.stringify(data));
  }

  async subscribeToChannel(channel, callback) {
    await this.subscriber.subscribe(channel, (message) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        console.error("Error parsing Redis message:", error);
      }
    });
  }

  async unsubscribeFromChannel(channel) {
    await this.subscriber.unsubscribe(channel);
  }

  // Session management
  async setUserSession(userId, sessionData) {
    await this.client.setEx(
      `session:${userId}`,
      86400,
      JSON.stringify(sessionData)
    ); // 24 hours
  }

  async getUserSession(userId) {
    const data = await this.client.get(`session:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId) {
    await this.client.del(`session:${userId}`);
  }

  // Rate limiting
  async checkRateLimit(key, limit, window) {
    const current = await this.client.incr(key);
    if (current === 1) {
      await this.client.expire(key, window);
    }
    return current <= limit;
  }

  // Call management
  async setCallData(callId, callData, ttl = 300) {
    try {
      await this.client.setEx(`call:${callId}`, ttl, JSON.stringify(callData));
    } catch (error) {
      console.error("Error setting call data:", error);
      throw error;
    }
  }

  async getCallData(callId) {
    try {
      const data = await this.client.get(`call:${callId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error getting call data:", error);
      return null;
    }
  }

  async deleteCallData(callId) {
    try {
      await this.client.del(`call:${callId}`);
    } catch (error) {
      console.error("Error deleting call data:", error);
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.client) return false;
      await this.client.ping();
      return true;
    } catch (error) {
      console.error("Redis health check failed:", error);
      return false;
    }
  }

  // Cleanup and disconnect
  async disconnect() {
    if (this.client) await this.client.disconnect();
    if (this.publisher) await this.publisher.disconnect();
    if (this.subscriber) await this.subscriber.disconnect();
    console.log("Redis disconnected");
  }
}

export const redisService = new RedisService();
