import express from "express";
import { notificationController } from "../controllers/notification.js";
import {
  authenticateToken,
  rateLimiter,
  validateBody,
} from "../middleware/auth.js";
import { paginationSchema, uuidParamSchema } from "../validation/schemas.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Rate limiting for notification operations
const notificationRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 notification operations per window
  message: "Too many notification requests, please try again later",
});

// TODO: Add rate limiting
// router.use(notificationRateLimit);

// Get notifications with pagination and filtering
// GET /api/notifications?page=1&limit=20&filter[status]=all&filter[type]=all
router.get(
  "/",
  notificationController.getNotifications.bind(notificationController)
);

// Get unread notifications count
// GET /api/notifications/unread-count
router.get(
  "/unread-count",
  notificationController.getUnreadCount.bind(notificationController)
);

// Get notification by ID
// GET /api/notifications/:notificationId
router.get(
  "/:notificationId",
  validateBody(uuidParamSchema, "params"),
  notificationController.getNotificationById.bind(notificationController)
);

// Mark notification as read
// PUT /api/notifications/:notificationId/read
router.put(
  "/:notificationId/read",
  validateBody(uuidParamSchema, "params"),
  notificationController.markAsRead.bind(notificationController)
);

// Mark all notifications as read
// PUT /api/notifications/mark-all-read
router.put(
  "/mark-all-read",
  notificationController.markAllAsRead.bind(notificationController)
);

// Delete notification
// DELETE /api/notifications/:notificationId
router.delete(
  "/:notificationId",
  validateBody(uuidParamSchema, "params"),
  notificationController.deleteNotification.bind(notificationController)
);

export default router;
