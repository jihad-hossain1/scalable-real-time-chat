import { db, users, calls } from '../models/db.js';
import { eq, and, desc, or } from 'drizzle-orm';
import { redisService } from '../services/redis.js';
import { socketHandler } from '../socket/socketHandler.js';

export class CallController {
  // Get call history for a user
  async getCallHistory(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 20, type } = req.query;
      const offset = (page - 1) * limit;

      // Build query conditions
      let whereCondition = or(
        eq(calls.callerId, userId),
        eq(calls.recipientId, userId)
      );

      // Filter by call type if specified
      if (type && ['video', 'audio'].includes(type)) {
        whereCondition = and(whereCondition, eq(calls.callType, type));
      }

      // Get call history from database
      const callHistory = await db.select({
        id: calls.id,
        callerId: calls.callerId,
        recipientId: calls.recipientId,
        callType: calls.callType,
        status: calls.status,
        startedAt: calls.startedAt,
        endedAt: calls.endedAt,
        duration: calls.duration,
        createdAt: calls.createdAt,
        callerUsername: users.username,
      })
      .from(calls)
      .leftJoin(users, eq(calls.callerId, users.id))
      .where(whereCondition)
      .orderBy(desc(calls.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

      // Get total count for pagination
      const totalResult = await db.select({ count: calls.id })
        .from(calls)
        .where(whereCondition);
      const total = totalResult.length;
      
      res.json({
        success: true,
        data: {
          calls: callHistory,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error getting call history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get call history'
      });
    }
  }

  // Get active calls for a user
  async getActiveCalls(req, res) {
    try {
      const userId = req.userId;
      
      // Check Redis for active calls involving this user
      const activeCalls = [];
      // In a real implementation, you'd scan Redis for active call keys
      
      res.json({
        success: true,
        data: {
          activeCalls
        }
      });
    } catch (error) {
      console.error('Error getting active calls:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active calls'
      });
    }
  }

  // Get call statistics
  async getCallStats(req, res) {
    try {
      const userId = req.userId;
      
      // Query database for call statistics
      const whereCondition = or(
        eq(calls.callerId, userId),
        eq(calls.recipientId, userId)
      );

      const allCalls = await db.select({
        callType: calls.callType,
        status: calls.status,
        duration: calls.duration
      })
      .from(calls)
      .where(whereCondition);

      const stats = {
        totalCalls: allCalls.length,
        totalDuration: allCalls.reduce((sum, call) => sum + (call.duration || 0), 0),
        videoCalls: allCalls.filter(call => call.callType === 'video').length,
        voiceCalls: allCalls.filter(call => call.callType === 'audio').length,
        missedCalls: allCalls.filter(call => call.status === 'missed').length,
        averageDuration: allCalls.length > 0 ? 
          Math.round(allCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / allCalls.length) : 0
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting call stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get call statistics'
      });
    }
  }

  // Check if user is available for calls
  async checkAvailability(req, res) {
    try {
      const { userId: targetUserId } = req.params;
      const currentUserId = req.userId;
      
      // Check if target user is online
      const isOnline = socketHandler.isUserConnected(targetUserId);
      
      // Check if user is already in a call (check Redis for active calls)
      const userStatus = await redisService.getUserStatus(targetUserId);
      const isInCall = false; // You'd implement logic to check if user is in an active call
      
      res.json({
        success: true,
        data: {
          available: isOnline && !isInCall,
          online: isOnline,
          inCall: isInCall,
          lastSeen: userStatus.lastSeen
        }
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check availability'
      });
    }
  }

  // End call via REST API (alternative to socket)
  async endCall(req, res) {
    try {
      const { callId } = req.params;
      const userId = req.userId;
      
      // Get call data from Redis
      const callData = await redisService.getCallData(callId);
      if (!callData) {
        return res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }
      
      // Verify user is part of the call
      if (callData.callerId !== userId && callData.recipientId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to end this call'
        });
      }
      
      // Update call status
      await redisService.setCallData(callId, {
        ...callData,
        status: 'ended',
        endedAt: new Date().toISOString(),
        endedBy: userId
      }, 60);
      
      // Notify the other participant via socket
      const otherUserId = callData.callerId === userId ? callData.recipientId : callData.callerId;
      socketHandler.emitToUser(otherUserId, 'call:ended', {
        callId,
        endedBy: userId
      });
      
      res.json({
        success: true,
        data: {
          callId,
          status: 'ended'
        }
      });
    } catch (error) {
      console.error('Error ending call:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to end call'
      });
    }
  }

  // Get call details
  async getCallDetails(req, res) {
    try {
      const { callId } = req.params;
      const userId = req.userId;
      
      const callData = await redisService.getCallData(callId);
      if (!callData) {
        return res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }
      
      // Verify user is part of the call
      if (callData.callerId !== userId && callData.recipientId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to view this call'
        });
      }
      
      res.json({
        success: true,
        data: callData
      });
    } catch (error) {
      console.error('Error getting call details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get call details'
      });
    }
  }
}