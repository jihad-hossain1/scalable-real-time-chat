import express from 'express';
import { messageController } from '../controllers/message.js';
import { authenticateToken, userRateLimiter, validateBody } from '../middleware/auth.js';
import { 
  sendMessageSchema, 
  editMessageSchema, 
  messageStatusSchema,
  paginationSchema,
  uuidParamSchema 
} from '../validation/schemas.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Rate limiting for message operations
const messageRateLimit = userRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute per user
  message: 'Too many messages sent, please slow down'
});

/**
 * @route   POST /api/messages/send
 * @desc    Send a new message
 * @access  Private
 */
router.post('/send',
  messageRateLimit,
  validateBody(sendMessageSchema),
  async (req, res, next) => {
    try {
      await messageController.sendMessage(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/messages/conversation/:userId
 * @desc    Get messages in a direct conversation
 * @access  Private
 */
router.get('/conversation/:userId',
  async (req, res, next) => {
    try {
      // Validate userId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.userId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Validate query parameters
      const { error: queryError } = paginationSchema.validate(req.query);
      if (queryError) {
        return res.status(400).json({ error: queryError.details[0].message });
      }

      await messageController.getDirectMessages(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/messages/group/:groupId
 * @desc    Get messages in a group conversation
 * @access  Private
 */
router.get('/group/:groupId',
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

      await messageController.getGroupMessages(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/messages/:messageId/edit
 * @desc    Edit a message
 * @access  Private
 */
router.put('/:messageId/edit',
  validateBody(editMessageSchema),
  async (req, res, next) => {
    try {
      // Validate messageId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.messageId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await messageController.editMessage(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/:messageId',
  async (req, res, next) => {
    try {
      // Validate messageId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.messageId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await messageController.deleteMessage(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/messages/:messageId/status
 * @desc    Update message status (delivered/read)
 * @access  Private
 */
router.put('/:messageId/status',
  validateBody(messageStatusSchema),
  async (req, res, next) => {
    try {
      // Validate messageId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.messageId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await messageController.updateMessageStatus(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/messages/:messageId
 * @desc    Get a specific message
 * @access  Private
 */
router.get('/:messageId',
  async (req, res, next) => {
    try {
      // Validate messageId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.messageId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await messageController.getMessage(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/messages/search
 * @desc    Search messages
 * @access  Private
 */
router.get('/search',
  async (req, res, next) => {
    try {
      const { query, userId, groupId, limit = 20, offset = 0 } = req.query;
      
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

      // Validate userId or groupId if provided
      if (userId) {
        const { error } = uuidParamSchema.validate({ id: userId });
        if (error) {
          return res.status(400).json({ error: 'Invalid userId format' });
        }
      }

      if (groupId) {
        const { error } = uuidParamSchema.validate({ id: groupId });
        if (error) {
          return res.status(400).json({ error: 'Invalid groupId format' });
        }
      }

      await messageController.searchMessages(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/messages/recent
 * @desc    Get recent conversations
 * @access  Private
 */
router.get('/recent',
  async (req, res, next) => {
    try {
      // Validate query parameters
      const { error } = paginationSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await messageController.getRecentConversations(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/messages/mark-read
 * @desc    Mark multiple messages as read
 * @access  Private
 */
router.put('/mark-read',
  async (req, res, next) => {
    try {
      const { messageIds, userId, groupId } = req.body;

      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ error: 'messageIds array is required' });
      }

      if (messageIds.length > 100) {
        return res.status(400).json({ error: 'Cannot mark more than 100 messages at once' });
      }

      // Validate all messageIds
      for (const messageId of messageIds) {
        const { error } = uuidParamSchema.validate({ id: messageId });
        if (error) {
          return res.status(400).json({ error: `Invalid messageId format: ${messageId}` });
        }
      }

      // Validate userId or groupId if provided
      if (userId) {
        const { error } = uuidParamSchema.validate({ id: userId });
        if (error) {
          return res.status(400).json({ error: 'Invalid userId format' });
        }
      }

      if (groupId) {
        const { error } = uuidParamSchema.validate({ id: groupId });
        if (error) {
          return res.status(400).json({ error: 'Invalid groupId format' });
        }
      }

      await messageController.markMessagesAsRead(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;