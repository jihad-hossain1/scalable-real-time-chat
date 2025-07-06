import { Server } from 'socket.io';
import { authenticateSocket } from '../middleware/auth.js';
import { redisService } from '../services/redis.js';
import { rabbitmqService } from '../services/rabbitmq.js';
import { db, users, groups, groupMembers, messages, messageStatus, calls } from '../models/db.js';
import { eq, and } from 'drizzle-orm';

class SocketHandler {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(authenticateSocket);

    // Handle connections
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Subscribe to Redis pub/sub for real-time updates
    this.subscribeToRedisChannels();

    console.log('✅ Socket.IO server initialized');
  }

  async handleConnection(socket) {
    const user = socket.user;
    const userId = user.id;

    console.log(`User ${user.username} connected with socket ${socket.id}`);

    try {
      // Add user to connected users map
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId).add(socket.id);

      // Update user status in Redis
      await redisService.setUserOnline(userId, socket.id);

      // Join user to their personal room
      socket.join(`user:${userId}`);

      // Join user to their group rooms
      await this.joinUserGroups(socket, userId);

      // Notify contacts about user coming online
      await this.broadcastPresenceUpdate(userId, 'online');

      // Set up event handlers
      this.setupEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

    } catch (error) {
      console.error('Error handling connection:', error);
      socket.emit('error', { message: 'Connection setup failed' });
    }
  }

  async handleDisconnection(socket) {
    const user = socket.user;
    const userId = user.id;

    console.log(`User ${user.username} disconnected from socket ${socket.id}`);

    try {
      // Remove socket from connected users
      if (this.connectedUsers.has(userId)) {
        this.connectedUsers.get(userId).delete(socket.id);
        
        // If no more sockets for this user, mark as offline
        if (this.connectedUsers.get(userId).size === 0) {
          this.connectedUsers.delete(userId);
          await redisService.setUserOffline(userId);
          await this.broadcastPresenceUpdate(userId, 'offline');
        }
      }

      // Stop any typing indicators
      await this.handleStopTyping(socket, { recipientId: null, groupId: null });

    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  setupEventHandlers(socket) {
    const userId = socket.user.id;

    // Message events
    socket.on('send_message', (data) => this.handleSendMessage(socket, data));
    socket.on('message_delivered', (data) => this.handleMessageDelivered(socket, data));
    socket.on('message_read', (data) => this.handleMessageRead(socket, data));
    socket.on('edit_message', (data) => this.handleEditMessage(socket, data));
    socket.on('delete_message', (data) => this.handleDeleteMessage(socket, data));

    // Typing indicators
    socket.on('start_typing', (data) => this.handleStartTyping(socket, data));
    socket.on('stop_typing', (data) => this.handleStopTyping(socket, data));

    // Group events
    socket.on('join_group', (data) => this.handleJoinGroup(socket, data));
    socket.on('leave_group', (data) => this.handleLeaveGroup(socket, data));

    // Presence events
    socket.on('get_online_users', () => this.handleGetOnlineUsers(socket));
    socket.on('ping', () => socket.emit('pong'));

    // Call events
    socket.on('call:initiate', (data, callback) => this.handleInitiateCall(socket, data, callback));
    socket.on('call:accept', (data, callback) => this.handleAcceptCall(socket, data, callback));
    socket.on('call:reject', (data, callback) => this.handleRejectCall(socket, data, callback));
    socket.on('call:end', (data, callback) => this.handleEndCall(socket, data, callback));
    socket.on('call:signal', (data) => this.handleCallSignal(socket, data));
    socket.on('call:ice-candidate', (data) => this.handleIceCandidate(socket, data));

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error from user ${userId}:`, error);
    });
  }

  async handleSendMessage(socket, data) {
    try {
      const { content, recipientId, groupId, messageType = 'text' } = data;
      const senderId = socket.user.id;

      // Validate message data
      if (!content || content.trim().length === 0) {
        socket.emit('message_error', { error: 'Message content cannot be empty' });
        return;
      }

      if (!recipientId && !groupId) {
        socket.emit('message_error', { error: 'Either recipientId or groupId must be provided' });
        return;
      }

      // Rate limiting check
      const rateLimitKey = `message_rate:${senderId}`;
      const allowed = await redisService.checkRateLimit(rateLimitKey, 30, 60); // 30 messages per minute
      
      if (!allowed) {
        socket.emit('message_error', { error: 'Rate limit exceeded. Please slow down.' });
        return;
      }

      // Publish to RabbitMQ for processing
      await rabbitmqService.publishMessage({
        content,
        senderId,
        recipientId,
        groupId,
        messageType,
        socketId: socket.id
      });

      // Acknowledge message received
      socket.emit('message_sent', { 
        tempId: data.tempId,
        status: 'processing'
      });

    } catch (error) {
      console.error('Error handling send message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  }

  async handleMessageDelivered(socket, data) {
    try {
      const { messageId } = data;
      const userId = socket.user.id;

      await rabbitmqService.publishMessageStatus({
        messageId,
        userId,
        status: 'delivered'
      });

    } catch (error) {
      console.error('Error handling message delivered:', error);
    }
  }

  async handleMessageRead(socket, data) {
    try {
      const { messageId } = data;
      const userId = socket.user.id;

      await rabbitmqService.publishMessageStatus({
        messageId,
        userId,
        status: 'read'
      });

    } catch (error) {
      console.error('Error handling message read:', error);
    }
  }

  async handleEditMessage(socket, data) {
    try {
      const { messageId, content } = data;
      const userId = socket.user.id;

      await rabbitmqService.publishMessage({
        type: 'EDIT_MESSAGE',
        messageId,
        senderId: userId,
        newContent: content
      });

    } catch (error) {
      console.error('Error handling edit message:', error);
      socket.emit('message_error', { error: 'Failed to edit message' });
    }
  }

  async handleDeleteMessage(socket, data) {
    try {
      const { messageId } = data;
      const userId = socket.user.id;

      await rabbitmqService.publishMessage({
        type: 'DELETE_MESSAGE',
        messageId,
        senderId: userId
      });

    } catch (error) {
      console.error('Error handling delete message:', error);
      socket.emit('message_error', { error: 'Failed to delete message' });
    }
  }

  async handleStartTyping(socket, data) {
    try {
      const { recipientId, groupId } = data;
      const userId = socket.user.id;
      const username = socket.user.username;

      if (!recipientId && !groupId) {
        return;
      }

      // Set typing indicator in Redis
      await redisService.setTyping(userId, recipientId || groupId, !!groupId);

      // Broadcast typing indicator
      if (groupId) {
        socket.to(`group:${groupId}`).emit('user_typing', {
          userId,
          username,
          groupId,
          isTyping: true
        });
      } else if (recipientId) {
        socket.to(`user:${recipientId}`).emit('user_typing', {
          userId,
          username,
          recipientId,
          isTyping: true
        });
      }

      // Publish typing indicator
      await rabbitmqService.publishTypingIndicator({
        userId,
        recipientId,
        groupId,
        isTyping: true
      });

    } catch (error) {
      console.error('Error handling start typing:', error);
    }
  }

  async handleStopTyping(socket, data) {
    try {
      const { recipientId, groupId } = data;
      const userId = socket.user.id;
      const username = socket.user.username;

      // Remove typing indicator from Redis
      if (recipientId) {
        await redisService.removeTyping(userId, recipientId, false);
      }
      if (groupId) {
        await redisService.removeTyping(userId, groupId, true);
      }

      // Broadcast stop typing
      if (groupId) {
        socket.to(`group:${groupId}`).emit('user_typing', {
          userId,
          username,
          groupId,
          isTyping: false
        });
      } else if (recipientId) {
        socket.to(`user:${recipientId}`).emit('user_typing', {
          userId,
          username,
          recipientId,
          isTyping: false
        });
      }

      // Publish typing indicator
      await rabbitmqService.publishTypingIndicator({
        userId,
        recipientId,
        groupId,
        isTyping: false
      });

    } catch (error) {
      console.error('Error handling stop typing:', error);
    }
  }

  async handleJoinGroup(socket, data) {
    try {
      const { groupId } = data;
      const userId = socket.user.id;

      // Verify user is a member of the group
      const membership = await db.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        ))
        .limit(1);

      if (membership.length > 0) {
        socket.join(`group:${groupId}`);
        socket.emit('group_joined', { groupId });
      } else {
        socket.emit('error', { message: 'Not a member of this group' });
      }

    } catch (error) {
      console.error('Error handling join group:', error);
      socket.emit('error', { message: 'Failed to join group' });
    }
  }

  async handleLeaveGroup(socket, data) {
    try {
      const { groupId } = data;
      
      socket.leave(`group:${groupId}`);
      socket.emit('group_left', { groupId });

    } catch (error) {
      console.error('Error handling leave group:', error);
    }
  }

  async handleGetOnlineUsers(socket) {
    try {
      const onlineUsers = await redisService.getOnlineUsers();
      socket.emit('online_users', { users: onlineUsers });

    } catch (error) {
      console.error('Error getting online users:', error);
      socket.emit('error', { message: 'Failed to get online users' });
    }
  }

  // Call event handlers
  async handleInitiateCall(socket, data, callback) {
    try {
      const { recipientId, callType, offer } = data;
      const callerId = socket.user.id;
      const callerUsername = socket.user.username;

      // Check if recipient is online
      if (!this.isUserConnected(recipientId)) {
        if (callback) callback({ success: false, error: 'User is offline' });
        return;
      }

      // Generate unique call ID
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store call data in Redis with expiration
      const callData = {
        callerId,
        recipientId,
        callType,
        status: 'ringing',
        createdAt: new Date().toISOString()
      };
      await redisService.setCallData(callId, callData, 300); // 5 minutes expiration

      // Save call to database
      await db.insert(calls).values({
        id: callId,
        callerId,
        recipientId,
        callType,
        status: 'ringing'
      });

      // Emit incoming call to recipient
      this.io.to(`user:${recipientId}`).emit('call:incoming', {
        callId,
        callerId,
        callerUsername,
        callType,
        offer
      });

      // Acknowledge to caller
      if (callback) {
        callback({ 
          success: true, 
          callId,
          status: 'ringing'
        });
      }

      console.log(`📞 Call initiated: ${callerId} -> ${recipientId} (${callType})`);

    } catch (error) {
      console.error('Error handling initiate call:', error);
      if (callback) callback({ success: false, error: 'Failed to initiate call' });
    }
  }

  async handleAcceptCall(socket, data, callback) {
    try {
      const { callId } = data;
      const userId = socket.user.id;
      const username = socket.user.username;

      // Get call data from Redis
      const callData = await redisService.getCallData(callId);
      if (!callData) {
        if (callback) callback({ success: false, error: 'Call not found' });
        return;
      }

      // Verify user is the recipient
      if (callData.recipientId !== userId) {
        if (callback) callback({ success: false, error: 'Unauthorized' });
        return;
      }

      // Update call status
      await redisService.setCallData(callId, {
        ...callData,
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      }, 300);

      // Update call status in database
      await db.update(calls)
        .set({ 
          status: 'accepted',
          startedAt: new Date()
        })
        .where(eq(calls.id, callId));

      // Notify caller that call was accepted
      this.io.to(`user:${callData.callerId}`).emit('call:accepted', {
        callId,
        recipientId: userId,
        recipientUsername: username
      });

      // Acknowledge to recipient
      if (callback) {
        callback({ 
          success: true, 
          callId,
          status: 'accepted'
        });
      }

      console.log(`✅ Call accepted: ${callId}`);

    } catch (error) {
      console.error('Error handling accept call:', error);
      if (callback) callback({ success: false, error: 'Failed to accept call' });
    }
  }

  async handleRejectCall(socket, data, callback) {
    try {
      const { callId } = data;
      const userId = socket.user.id;

      // Get call data from Redis
      const callData = await redisService.getCallData(callId);
      if (!callData) {
        if (callback) callback({ success: false, error: 'Call not found' });
        return;
      }

      // Verify user is the recipient
      if (callData.recipientId !== userId) {
        if (callback) callback({ success: false, error: 'Unauthorized' });
        return;
      }

      // Update call status
      await redisService.setCallData(callId, {
        ...callData,
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      }, 60); // Keep for 1 minute for cleanup

      // Update call status in database
      await db.update(calls)
        .set({ status: 'rejected' })
        .where(eq(calls.id, callId));

      // Notify caller that call was rejected
      this.io.to(`user:${callData.callerId}`).emit('call:rejected', {
        callId,
        recipientId: userId
      });

      // Acknowledge to recipient
      if (callback) {
        callback({ 
          success: true, 
          callId,
          status: 'rejected'
        });
      }

      console.log(`❌ Call rejected: ${callId}`);

    } catch (error) {
      console.error('Error handling reject call:', error);
      if (callback) callback({ success: false, error: 'Failed to reject call' });
    }
  }

  async handleEndCall(socket, data, callback) {
    try {
      const { callId } = data;
      const userId = socket.user.id;

      // Get call data from Redis
      const callData = await redisService.getCallData(callId);
      if (!callData) {
        if (callback) callback({ success: false, error: 'Call not found' });
        return;
      }

      // Verify user is part of the call
      if (callData.callerId !== userId && callData.recipientId !== userId) {
        if (callback) callback({ success: false, error: 'Unauthorized' });
        return;
      }

      // Calculate duration if call was accepted
      const endTime = new Date();
      let duration = null;
      if (callData.status === 'accepted' && callData.acceptedAt) {
        const startTime = new Date(callData.acceptedAt);
        duration = Math.floor((endTime - startTime) / 1000); // duration in seconds
      }

      // Update call status
      await redisService.setCallData(callId, {
        ...callData,
        status: 'ended',
        endedAt: endTime.toISOString(),
        endedBy: userId,
        duration
      }, 60); // Keep for 1 minute for cleanup

      // Update call status in database
      await db.update(calls)
        .set({ 
          status: 'ended',
          endedAt: endTime,
          endedBy: userId,
          duration
        })
        .where(eq(calls.id, callId));

      // Notify the other participant
      const otherUserId = callData.callerId === userId ? callData.recipientId : callData.callerId;
      this.io.to(`user:${otherUserId}`).emit('call:ended', {
        callId,
        endedBy: userId
      });

      // Acknowledge to caller
      if (callback) {
        callback({ 
          success: true, 
          callId,
          status: 'ended'
        });
      }

      console.log(`🔚 Call ended: ${callId} by ${userId}`);

    } catch (error) {
      console.error('Error handling end call:', error);
      if (callback) callback({ success: false, error: 'Failed to end call' });
    }
  }

  async handleCallSignal(socket, data) {
    try {
      const { callId, signal } = data;
      const userId = socket.user.id;

      // Get call data from Redis
      const callData = await redisService.getCallData(callId);
      if (!callData) {
        socket.emit('call:error', { callId, error: 'Call not found' });
        return;
      }

      // Verify user is part of the call
      if (callData.callerId !== userId && callData.recipientId !== userId) {
        socket.emit('call:error', { callId, error: 'Unauthorized' });
        return;
      }

      // Forward signal to the other participant
      const otherUserId = callData.callerId === userId ? callData.recipientId : callData.callerId;
      this.io.to(`user:${otherUserId}`).emit('call:signal', {
        callId,
        signal,
        from: userId
      });

    } catch (error) {
      console.error('Error handling call signal:', error);
      socket.emit('call:error', { error: 'Failed to send signal' });
    }
  }

  async handleIceCandidate(socket, data) {
    try {
      const { callId, candidate } = data;
      const userId = socket.user.id;

      // Get call data from Redis
      const callData = await redisService.getCallData(callId);
      if (!callData) {
        return; // Silently ignore if call not found (call might have ended)
      }

      // Verify user is part of the call
      if (callData.callerId !== userId && callData.recipientId !== userId) {
        return;
      }

      // Forward ICE candidate to the other participant
      const otherUserId = callData.callerId === userId ? callData.recipientId : callData.callerId;
      this.io.to(`user:${otherUserId}`).emit('call:ice-candidate', {
        callId,
        candidate,
        from: userId
      });

    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  async joinUserGroups(socket, userId) {
    try {
      // Get user's groups
      const userGroups = await db.select({ groupId: groupMembers.groupId })
        .from(groupMembers)
        .where(eq(groupMembers.userId, userId));

      // Join each group room
      for (const group of userGroups) {
        socket.join(`group:${group.groupId}`);
      }

    } catch (error) {
      console.error('Error joining user groups:', error);
    }
  }

  async broadcastPresenceUpdate(userId, status) {
    try {
      // Publish presence update
      await rabbitmqService.publishPresenceUpdate({
        userId,
        status,
        timestamp: new Date().toISOString()
      });

      // Broadcast to all connected clients
      this.io.emit('user_presence', {
        userId,
        status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error broadcasting presence update:', error);
    }
  }

  async subscribeToRedisChannels() {
    try {
      // Subscribe to message updates
      await redisService.subscribeToChannel('message_updates', (data) => {
        this.handleMessageUpdate(data);
      });

      // Subscribe to presence updates
      await redisService.subscribeToChannel('presence_updates', (data) => {
        this.handlePresenceUpdate(data);
      });

      // Subscribe to group updates
      await redisService.subscribeToChannel('group_updates', (data) => {
        this.handleGroupUpdate(data);
      });

      console.log('✅ Subscribed to Redis channels');

    } catch (error) {
      console.error('Error subscribing to Redis channels:', error);
    }
  }

  handleMessageUpdate(data) {
    const { type, messageData, recipientId, groupId } = data;

    if (groupId) {
      // Broadcast to group
      this.io.to(`group:${groupId}`).emit('message_update', {
        type,
        message: messageData
      });
    } else if (recipientId) {
      // Send to specific user
      this.io.to(`user:${recipientId}`).emit('message_update', {
        type,
        message: messageData
      });
    }
  }

  handlePresenceUpdate(data) {
    const { userId, status } = data;
    
    // Broadcast presence update to all clients
    this.io.emit('user_presence', {
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  handleGroupUpdate(data) {
    const { type, groupId, groupData, memberIds } = data;

    // Broadcast to group members
    if (memberIds && memberIds.length > 0) {
      memberIds.forEach(memberId => {
        this.io.to(`user:${memberId}`).emit('group_update', {
          type,
          groupId,
          groupData
        });
      });
    }
  }

  // Public methods for external use
  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  emitToGroup(groupId, event, data) {
    this.io.to(`group:${groupId}`).emit(event, data);
  }

  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  getConnectedUserCount() {
    return this.connectedUsers.size;
  }

  isUserConnected(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }
}

export const socketHandler = new SocketHandler();