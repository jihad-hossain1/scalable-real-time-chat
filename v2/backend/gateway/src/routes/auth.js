import express from "express";
import { authController } from "../controllers/auth.js";
import {
  authenticateToken,
  optionalAuth,
  rateLimiter,
  validateBody,
} from "../middleware/auth.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validation/schemas.js";

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 10 requests per window
  message: "Too many authentication attempts, please try again later",
});

const loginRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 5 login attempts per window
  message: "Too many login attempts, please try again later",
});

// Public routes

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  // authRateLimit, // TODO: when production uncomment this
  validateBody(registerSchema),
  async (req, res, next) => {
    console.log(
      `🚀 ~ AuthController ~ register ~ { username, email, password }:`,
      req.body
    );
    try {
      await authController.register(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  "/login",
  // loginRateLimit, // TODO: when production uncomment this
  validateBody(loginSchema),
  async (req, res, next) => {
    try {
      await authController.login(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  "/refresh",
  authRateLimit,
  validateBody(refreshTokenSchema),
  async (req, res, next) => {
    try {
      await authController.refreshToken(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/validate
 * @desc    Validate token
 * @access  Public
 */
router.post("/validate", optionalAuth, async (req, res, next) => {
  try {
    await authController.validateToken(req, res);
  } catch (error) {
    next(error);
  }
});

// Protected routes

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", authenticateToken, async (req, res, next) => {
  try {
    await authController.logout(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get("/profile", authenticateToken, async (req, res, next) => {
  try {
    await authController.getProfile(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  authenticateToken,
  validateBody(updateProfileSchema),
  async (req, res, next) => {
    try {
      await authController.updateProfile(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  "/change-password",
  authenticateToken,
  validateBody(changePasswordSchema),
  async (req, res, next) => {
    try {
      await authController.changePassword(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    await authController.getProfile(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
