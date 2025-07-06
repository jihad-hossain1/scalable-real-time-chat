import express from 'express';
import { groupController } from '../controllers/group.js';
import { authenticateToken, rateLimiter, validateBody } from '../middleware/auth.js';
import { 
  createGroupSchema, 
  updateGroupSchema, 
  addGroupMembersSchema, 
  updateMemberRoleSchema,
  paginationSchema,
  uuidParamSchema 
} from '../validation/schemas.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Rate limiting for group operations
const groupRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 group operations per window
  message: 'Too many group operations, please try again later'
});

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 */
router.post('/',
  groupRateLimit,
  validateBody(createGroupSchema),
  async (req, res, next) => {
    try {
      await groupController.createGroup(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/groups
 * @desc    Get user's groups
 * @access  Private
 */
router.get('/',
  async (req, res, next) => {
    try {
      // Validate query parameters
      const { error } = paginationSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await groupController.getUserGroups(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/groups/:groupId
 * @desc    Get group details
 * @access  Private
 */
router.get('/:groupId',
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await groupController.getGroupById(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/groups/:groupId
 * @desc    Update group details
 * @access  Private
 */
router.put('/:groupId',
  validateBody(updateGroupSchema),
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await groupController.updateGroup(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/groups/:groupId
 * @desc    Delete a group
 * @access  Private
 */
router.delete('/:groupId',
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await groupController.deleteGroup(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/groups/:groupId/members
 * @desc    Get group members
 * @access  Private
 */
router.get('/:groupId/members',
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Validate query parameters
      const { error: queryError } = paginationSchema.validate(req.query);
      if (queryError) {
        return res.status(400).json({ error: queryError.details[0].message });
      }

      await groupController.getGroupMembers(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/groups/:groupId/members
 * @desc    Add member to group
 * @access  Private
 */
router.post('/:groupId/members',
  validateBody(addGroupMembersSchema),
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await groupController.addGroupMember(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/groups/:groupId/members/:userId
 * @desc    Remove member from group
 * @access  Private
 */
router.delete('/:groupId/members/:userId',
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error: groupError } = uuidParamSchema.validate({ id: req.params.groupId });
      if (groupError) {
        return res.status(400).json({ error: 'Invalid groupId format' });
      }

      // Validate userId parameter
      const { error: userError } = uuidParamSchema.validate({ id: req.params.userId });
      if (userError) {
        return res.status(400).json({ error: 'Invalid userId format' });
      }

      await groupController.removeGroupMember(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/groups/:groupId/members/:userId/role
 * @desc    Update member role
 * @access  Private
 */
router.put('/:groupId/members/:userId/role',
  validateBody(updateMemberRoleSchema),
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error: groupError } = uuidParamSchema.validate({ id: req.params.groupId });
      if (groupError) {
        return res.status(400).json({ error: 'Invalid groupId format' });
      }

      // Validate userId parameter
      const { error: userError } = uuidParamSchema.validate({ id: req.params.userId });
      if (userError) {
        return res.status(400).json({ error: 'Invalid userId format' });
      }

      await groupController.updateMemberRole(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/groups/:groupId/leave
 * @desc    Leave a group
 * @access  Private
 */
router.post('/:groupId/leave',
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await groupController.leaveGroup(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/groups/:groupId/join
 * @desc    Join a group (if public or invited)
 * @access  Private
 */
router.post('/:groupId/join',
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { inviteCode } = req.body;

      // Add inviteCode to request for controller
      req.body.inviteCode = inviteCode;

      await groupController.joinGroup(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/groups/search
 * @desc    Search public groups
 * @access  Private
 */
router.get('/search',
  async (req, res, next) => {
    try {
      const { query, limit = 20, offset = 0 } = req.query;
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      if (query.trim().length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      // Validate pagination
      const { error: paginationError } = paginationSchema.validate({ limit, offset });
      if (paginationError) {
        return res.status(400).json({ error: paginationError.details[0].message });
      }

      await groupController.searchGroups(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/groups/:groupId/invite-code
 * @desc    Generate new invite code for group
 * @access  Private
 */
router.post('/:groupId/invite-code',
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await groupController.generateInviteCode(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/groups/:groupId/invite-code
 * @desc    Revoke invite code for group
 * @access  Private
 */
router.delete('/:groupId/invite-code',
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await groupController.revokeInviteCode(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/groups/:groupId/stats
 * @desc    Get group statistics
 * @access  Private
 */
router.get('/:groupId/stats',
  async (req, res, next) => {
    try {
      // Validate groupId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.groupId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await groupController.getGroupStats(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;