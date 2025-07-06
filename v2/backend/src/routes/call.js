import express from 'express';
import { CallController } from '../controllers/call.js';
import { authenticateToken, rateLimiter, validateBody } from '../middleware/auth.js';
import { paginationSchema, uuidParamSchema } from '../validation/schemas.js';

const router = express.Router();
const callController = new CallController();

// Apply authentication to all routes
router.use(authenticateToken);

// Rate limiting for call operations
const callRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 call operations per window
  message: 'Too many call operations, please try again later'
});

router.use(callRateLimit);

/**
 * @route   GET /api/calls/history
 * @desc    Get call history for the authenticated user
 * @access  Private
 * @query   page, limit, type (voice|video)
 */
router.get('/history', 
  validateBody(paginationSchema, 'query'),
  callController.getCallHistory
);

/**
 * @route   GET /api/calls/active
 * @desc    Get active calls for the authenticated user
 * @access  Private
 */
router.get('/active', callController.getActiveCalls);

/**
 * @route   GET /api/calls/stats
 * @desc    Get call statistics for the authenticated user
 * @access  Private
 */
router.get('/stats', callController.getCallStats);

/**
 * @route   GET /api/calls/availability/:userId
 * @desc    Check if a user is available for calls
 * @access  Private
 * @params  userId - UUID of the user to check
 */
router.get('/availability/:userId',
  validateBody(uuidParamSchema, 'params'),
  callController.checkAvailability
);

/**
 * @route   GET /api/calls/:callId
 * @desc    Get details of a specific call
 * @access  Private
 * @params  callId - ID of the call
 */
router.get('/:callId', callController.getCallDetails);

/**
 * @route   DELETE /api/calls/:callId
 * @desc    End a specific call
 * @access  Private
 * @params  callId - ID of the call to end
 */
router.delete('/:callId', callController.endCall);

export default router;