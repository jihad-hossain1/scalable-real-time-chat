import { db, groups, groupMembers, users, messages } from '../models/db.js';
import { eq, and, desc, ilike, or } from 'drizzle-orm';
import { validateBody } from '../middleware/auth.js';
import { rabbitmqService } from '../services/rabbitmq.js';
import { redisService } from '../services/redis.js';
import {
  createGroupSchema,
  updateGroupSchema,
  addGroupMembersSchema,
  removeGroupMemberSchema,
  updateMemberRoleSchema,
  paginationSchema
} from '../validation/schemas.js';

class GroupController {
  // Create a new group
  async createGroup(req, res) {
    try {
      const { name, description, avatar, memberIds = [] } = req.body;
      const creatorId = req.userId;
      
      // Create the group
      const newGroup = await db.insert(groups).values({
        name,
        description,
        avatar,
        createdBy: creatorId
      }).returning();
      
      const group = newGroup[0];
      
      // Add creator as admin
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: creatorId,
        role: 'admin'
      });
      
      // Add other members if provided
      if (memberIds.length > 0) {
        const memberValues = memberIds.map(memberId => ({
          groupId: group.id,
          userId: memberId,
          role: 'member'
        }));
        
        await db.insert(groupMembers).values(memberValues);
      }
      
      // Get group with members
      const groupWithMembers = await this.getGroupWithMembers(group.id);
      
      // Publish group creation event
      await rabbitmqService.publishGroupEvent({
        type: 'GROUP_CREATED',
        groupId: group.id,
        creatorId,
        memberIds: [creatorId, ...memberIds],
        groupData: groupWithMembers
      });
      
      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: groupWithMembers
      });
    } catch (error) {
      console.error('Create group error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to create group',
        code: 'CREATE_GROUP_ERROR'
      });
    }
  }
  
  // Get user's groups
  async getUserGroups(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 20 } = req.query;
      
      const offset = (page - 1) * limit;
      
      const userGroups = await db.select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        avatar: groups.avatar,
        createdBy: groups.createdBy,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
        memberRole: groupMembers.role,
        joinedAt: groupMembers.joinedAt
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId))
      .orderBy(desc(groups.updatedAt))
      .limit(limit)
      .offset(offset);
      
      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        userGroups.map(async (group) => {
          const memberCount = await this.getGroupMemberCount(group.id);
          const lastMessage = await this.getGroupLastMessage(group.id);
          
          return {
            ...group,
            memberCount,
            lastMessage
          };
        })
      );
      
      res.json({
        success: true,
        data: groupsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: groupsWithCounts.length
        }
      });
    } catch (error) {
      console.error('Get user groups error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get groups',
        code: 'GET_GROUPS_ERROR'
      });
    }
  }
  
  // Get group details
  async getGroupById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      
      // Check if user is a member of the group
      const membership = await db.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId)
        ))
        .limit(1);
      
      if (membership.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You are not a member of this group.',
          code: 'ACCESS_DENIED'
        });
      }
      
      const groupData = await this.getGroupWithMembers(id);
      
      if (!groupData) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
          code: 'GROUP_NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        data: {
          ...groupData,
          userRole: membership[0].role
        }
      });
    } catch (error) {
      console.error('Get group by ID error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get group',
        code: 'GET_GROUP_ERROR'
      });
    }
  }
  
  // Update group
  async updateGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updateData = req.body;
      
      // Check if user is admin of the group
      const membership = await db.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId),
          eq(groupMembers.role, 'admin')
        ))
        .limit(1);
      
      if (membership.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only group admins can update group details.',
          code: 'ADMIN_REQUIRED'
        });
      }
      
      // Update group
      const updatedGroup = await db.update(groups)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(groups.id, id))
        .returning();
      
      if (updatedGroup.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
          code: 'GROUP_NOT_FOUND'
        });
      }
      
      const groupWithMembers = await this.getGroupWithMembers(id);
      
      // Publish group update event
      await rabbitmqService.publishGroupEvent({
        type: 'GROUP_UPDATED',
        groupId: id,
        updatedBy: userId,
        updateData,
        groupData: groupWithMembers
      });
      
      res.json({
        success: true,
        message: 'Group updated successfully',
        data: groupWithMembers
      });
    } catch (error) {
      console.error('Update group error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update group',
        code: 'UPDATE_GROUP_ERROR'
      });
    }
  }
  
  // Add members to group
  async addMembers(req, res) {
    try {
      const { id } = req.params;
      const { memberIds } = req.body;
      const userId = req.userId;
      
      // Check if user is admin of the group
      const membership = await db.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId),
          eq(groupMembers.role, 'admin')
        ))
        .limit(1);
      
      if (membership.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only group admins can add members.',
          code: 'ADMIN_REQUIRED'
        });
      }
      
      // Check if users exist and are not already members
      const existingMembers = await db.select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, id));
      
      const existingMemberIds = existingMembers.map(m => m.userId);
      const newMemberIds = memberIds.filter(memberId => !existingMemberIds.includes(memberId));
      
      if (newMemberIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'All specified users are already members of this group',
          code: 'ALREADY_MEMBERS'
        });
      }
      
      // Add new members
      const memberValues = newMemberIds.map(memberId => ({
        groupId: id,
        userId: memberId,
        role: 'member'
      }));
      
      await db.insert(groupMembers).values(memberValues);
      
      const groupWithMembers = await this.getGroupWithMembers(id);
      
      // Publish member addition event
      await rabbitmqService.publishGroupEvent({
        type: 'MEMBERS_ADDED',
        groupId: id,
        addedBy: userId,
        newMemberIds,
        groupData: groupWithMembers
      });
      
      res.json({
        success: true,
        message: `${newMemberIds.length} member(s) added successfully`,
        data: groupWithMembers
      });
    } catch (error) {
      console.error('Add members error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to add members',
        code: 'ADD_MEMBERS_ERROR'
      });
    }
  }
  
  // Remove member from group
  async removeMember(req, res) {
    try {
      const { id } = req.params;
      const { memberId } = req.body;
      const userId = req.userId;
      
      // Check if user is admin of the group or removing themselves
      const membership = await db.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId)
        ))
        .limit(1);
      
      if (membership.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You are not a member of this group.',
          code: 'ACCESS_DENIED'
        });
      }
      
      const isAdmin = membership[0].role === 'admin';
      const isSelfRemoval = userId === memberId;
      
      if (!isAdmin && !isSelfRemoval) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only admins can remove other members.',
          code: 'ADMIN_REQUIRED'
        });
      }
      
      // Check if member exists in group
      const memberToRemove = await db.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, memberId)
        ))
        .limit(1);
      
      if (memberToRemove.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Member not found in this group',
          code: 'MEMBER_NOT_FOUND'
        });
      }
      
      // Prevent removing the last admin
      if (memberToRemove[0].role === 'admin') {
        const adminCount = await db.select()
          .from(groupMembers)
          .where(and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.role, 'admin')
          ));
        
        if (adminCount.length === 1) {
          return res.status(400).json({
            success: false,
            error: 'Cannot remove the last admin from the group',
            code: 'LAST_ADMIN'
          });
        }
      }
      
      // Remove member
      await db.delete(groupMembers)
        .where(and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, memberId)
        ));
      
      const groupWithMembers = await this.getGroupWithMembers(id);
      
      // Publish member removal event
      await rabbitmqService.publishGroupEvent({
        type: 'MEMBER_REMOVED',
        groupId: id,
        removedBy: userId,
        removedMemberId: memberId,
        groupData: groupWithMembers
      });
      
      res.json({
        success: true,
        message: 'Member removed successfully',
        data: groupWithMembers
      });
    } catch (error) {
      console.error('Remove member error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to remove member',
        code: 'REMOVE_MEMBER_ERROR'
      });
    }
  }
  
  // Update member role
  async updateMemberRole(req, res) {
    try {
      const { id } = req.params;
      const { memberId, role } = req.body;
      const userId = req.userId;
      
      // Check if user is admin of the group
      const membership = await db.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId),
          eq(groupMembers.role, 'admin')
        ))
        .limit(1);
      
      if (membership.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only group admins can update member roles.',
          code: 'ADMIN_REQUIRED'
        });
      }
      
      // Check if member exists in group
      const memberToUpdate = await db.select()
        .from(groupMembers)
        .where(and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, memberId)
        ))
        .limit(1);
      
      if (memberToUpdate.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Member not found in this group',
          code: 'MEMBER_NOT_FOUND'
        });
      }
      
      // Prevent demoting the last admin
      if (memberToUpdate[0].role === 'admin' && role === 'member') {
        const adminCount = await db.select()
          .from(groupMembers)
          .where(and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.role, 'admin')
          ));
        
        if (adminCount.length === 1) {
          return res.status(400).json({
            success: false,
            error: 'Cannot demote the last admin of the group',
            code: 'LAST_ADMIN'
          });
        }
      }
      
      // Update member role
      await db.update(groupMembers)
        .set({ role })
        .where(and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, memberId)
        ));
      
      const groupWithMembers = await this.getGroupWithMembers(id);
      
      // Publish role update event
      await rabbitmqService.publishGroupEvent({
        type: 'MEMBER_ROLE_UPDATED',
        groupId: id,
        updatedBy: userId,
        memberId,
        newRole: role,
        groupData: groupWithMembers
      });
      
      res.json({
        success: true,
        message: 'Member role updated successfully',
        data: groupWithMembers
      });
    } catch (error) {
      console.error('Update member role error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update member role',
        code: 'UPDATE_ROLE_ERROR'
      });
    }
  }
  
  // Leave group
  async leaveGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      
      // Use the removeMember logic for leaving
      req.body = { memberId: userId };
      await this.removeMember(req, res);
    } catch (error) {
      console.error('Leave group error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to leave group',
        code: 'LEAVE_GROUP_ERROR'
      });
    }
  }
  
  // Delete group
  async deleteGroup(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      
      // Check if user is the creator of the group
      const group = await db.select()
        .from(groups)
        .where(eq(groups.id, id))
        .limit(1);
      
      if (group.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
          code: 'GROUP_NOT_FOUND'
        });
      }
      
      if (group[0].createdBy !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only the group creator can delete the group.',
          code: 'CREATOR_REQUIRED'
        });
      }
      
      // Get all members before deletion
      const allMembers = await db.select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, id));
      
      // Delete group (cascade will handle members and messages)
      await db.delete(groups).where(eq(groups.id, id));
      
      // Publish group deletion event
      await rabbitmqService.publishGroupEvent({
        type: 'GROUP_DELETED',
        groupId: id,
        deletedBy: userId,
        memberIds: allMembers.map(m => m.userId)
      });
      
      res.json({
        success: true,
        message: 'Group deleted successfully'
      });
    } catch (error) {
      console.error('Delete group error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete group',
        code: 'DELETE_GROUP_ERROR'
      });
    }
  }
  
  // Helper methods
  async getGroupWithMembers(groupId) {
    try {
      const group = await db.select()
        .from(groups)
        .where(eq(groups.id, groupId))
        .limit(1);
      
      if (group.length === 0) return null;
      
      const members = await db.select({
        id: users.id,
        username: users.username,
        avatar: users.avatar,
        isOnline: users.isOnline,
        lastSeen: users.lastSeen,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));
      
      // Get online status from Redis for each member
      const membersWithStatus = await Promise.all(
        members.map(async (member) => {
          const userStatus = await redisService.getUserStatus(member.id);
          return {
            ...member,
            socketStatus: userStatus.status || 'offline'
          };
        })
      );
      
      return {
        ...group[0],
        members: membersWithStatus,
        memberCount: members.length
      };
    } catch (error) {
      console.error('Get group with members error:', error);
      return null;
    }
  }
  
  async getGroupMemberCount(groupId) {
    try {
      const count = await db.select()
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));
      return count.length;
    } catch (error) {
      return 0;
    }
  }
  
  async getGroupLastMessage(groupId) {
    try {
      const lastMessage = await db.select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        senderUsername: users.username,
        messageType: messages.messageType,
        createdAt: messages.createdAt
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.groupId, groupId))
      .orderBy(desc(messages.createdAt))
      .limit(1);
      
      return lastMessage[0] || null;
    } catch (error) {
      return null;
    }
  }
}

export const groupController = new GroupController();

// Export route handlers with validation
export const groupRoutes = {
  createGroup: [validateBody(createGroupSchema), groupController.createGroup.bind(groupController)],
  getUserGroups: [validateBody(paginationSchema), groupController.getUserGroups.bind(groupController)],
  getGroupById: groupController.getGroupById.bind(groupController),
  updateGroup: [validateBody(updateGroupSchema), groupController.updateGroup.bind(groupController)],
  addMembers: [validateBody(addGroupMembersSchema), groupController.addMembers.bind(groupController)],
  removeMember: [validateBody(removeGroupMemberSchema), groupController.removeMember.bind(groupController)],
  updateMemberRole: [validateBody(updateMemberRoleSchema), groupController.updateMemberRole.bind(groupController)],
  leaveGroup: groupController.leaveGroup.bind(groupController),
  deleteGroup: groupController.deleteGroup.bind(groupController)
};