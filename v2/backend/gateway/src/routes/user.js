import express from 'express';
import { authController } from '../controllers/auth.js';
import { authenticateToken, rateLimiter } from '../middleware/auth.js';
import { paginationSchema, uuidParamSchema } from '../validation/schemas.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Rate limiting for user operations
const userRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 user operations per window
  message: 'Too many user operations, please try again later'
});

/**
 * @route   GET /api/users/search
 * @desc    Search users by username or email
 * @access  Private
 */
router.get('/search',
  userRateLimit,
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

      await authController.searchUsers(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user details by ID
 * @access  Private
 */
router.get('/:userId',
  async (req, res, next) => {
    try {
      // Validate userId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.userId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authController.getUserById(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/users/:userId/status
 * @desc    Get user online status
 * @access  Private
 */
router.get('/:userId/status',
  async (req, res, next) => {
    try {
      // Validate userId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.userId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authController.getUserStatus(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/users/online
 * @desc    Get list of online users
 * @access  Private
 */
router.get('/online',
  async (req, res, next) => {
    try {
      // Validate query parameters
      const { error } = paginationSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authController.getOnlineUsers(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/users/contacts
 * @desc    Get user's contacts/recent conversations
 * @access  Private
 */
router.get('/contacts',
  async (req, res, next) => {
    try {
      // Validate query parameters
      const { error } = paginationSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authController.getUserContacts(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/users/:userId/block
 * @desc    Block a user
 * @access  Private
 */
router.post('/:userId/block',
  async (req, res, next) => {
    try {
      // Validate userId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.userId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authController.blockUser(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/users/:userId/block
 * @desc    Unblock a user
 * @access  Private
 */
router.delete('/:userId/block',
  async (req, res, next) => {
    try {
      // Validate userId parameter
      const { error } = uuidParamSchema.validate({ id: req.params.userId });
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authController.unblockUser(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/users/blocked
 * @desc    Get list of blocked users
 * @access  Private
 */
router.get('/blocked',
  async (req, res, next) => {
    try {
      // Validate query parameters
      const { error } = paginationSchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await authController.getBlockedUsers(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;