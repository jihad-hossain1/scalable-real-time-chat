import { authService } from "../services/auth.js";
import { redisService } from "../services/redis.js";
import { validateBody } from "../middleware/auth.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validation/schemas.js";

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      const result = await authService.register({ username, email, password });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
    } catch (error) {
      console.error("Registration error:", error);

      if (
        error.message.includes("already exists") ||
        error.message.includes("already taken")
      ) {
        return res.status(409).json({
          success: false,
          error: error.message,
          code: "USER_EXISTS",
        });
      }

      res.status(500).json({
        success: false,
        error: "Registration failed",
        code: "REGISTRATION_ERROR",
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      console.error("Login error:", error);

      if (error.message.includes("Invalid email or password")) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        });
      }

      res.status(500).json({
        success: false,
        error: "Login failed",
        code: "LOGIN_ERROR",
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
      });
    } catch (error) {
      console.error("Token refresh error:", error);

      res.status(401).json({
        success: false,
        error: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const userId = req.userId;

      await authService.logout(userId);

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);

      res.status(500).json({
        success: false,
        error: "Logout failed",
        code: "LOGOUT_ERROR",
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = req.user;

      // Get additional user status from Redis
      const userStatus = await redisService.getUserStatus(user.id);

      res.json({
        success: true,
        data: {
          ...user,
          socketStatus: userStatus.status || "offline",
          lastActivity: userStatus.lastSeen || user.lastSeen,
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to get profile",
        code: "PROFILE_ERROR",
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.userId;
      const updateData = req.body;

      const updatedUser = await authService.updateProfile(userId, updateData);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);

      if (error.message.includes("No valid fields")) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: "INVALID_UPDATE_DATA",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to update profile",
        code: "UPDATE_PROFILE_ERROR",
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);

      if (error.message.includes("Current password is incorrect")) {
        return res.status(400).json({
          success: false,
          error: "Current password is incorrect",
          code: "INCORRECT_PASSWORD",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to change password",
        code: "CHANGE_PASSWORD_ERROR",
      });
    }
  }

  // Get user by ID (for other users to view profiles)
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await authService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Get user status from Redis
      const userStatus = await redisService.getUserStatus(id);

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          socketStatus: userStatus.status || "offline",
        },
      });
    } catch (error) {
      console.error("Get user by ID error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to get user",
        code: "GET_USER_ERROR",
      });
    }
  }

  // Search users
  async searchUsers(req, res) {
    try {
      const { search, limit = 10 } = req.query;

      if (!search || search.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Search query must be at least 2 characters",
          code: "INVALID_SEARCH_QUERY",
        });
      }

      // This would typically use a full-text search or database query
      // For now, we'll implement a basic search
      const { db, users } = await import("../models/db.js");
      const { ilike, or } = await import("drizzle-orm");

      const searchResults = await db
        .select({
          id: users.id,
          username: users.username,
          avatar: users.avatar,
          isOnline: users.isOnline,
          lastSeen: users.lastSeen,
        })
        .from(users)
        .where(
          or(
            ilike(users.username, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )
        )
        .limit(parseInt(limit));

      // Get online status for each user
      const usersWithStatus = await Promise.all(
        searchResults.map(async (user) => {
          const userStatus = await redisService.getUserStatus(user.id);
          return {
            ...user,
            socketStatus: userStatus.status || "offline",
          };
        })
      );

      res.json({
        success: true,
        data: usersWithStatus,
      });
    } catch (error) {
      console.error("Search users error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to search users",
        code: "SEARCH_USERS_ERROR",
      });
    }
  }

  // Validate token (for client-side token validation)
  async validateToken(req, res) {
    try {
      // If we reach here, the token is valid (middleware already validated it)
      res.json({
        success: true,
        message: "Token is valid",
        data: {
          user: req.user,
          tokenData: req.tokenData,
        },
      });
    } catch (error) {
      console.error("Validate token error:", error);

      res.status(500).json({
        success: false,
        error: "Token validation failed",
        code: "TOKEN_VALIDATION_ERROR",
      });
    }
  }
}

export const authController = new AuthController();

// Export route handlers with validation
export const authRoutes = {
  register: [
    validateBody(registerSchema),
    authController.register.bind(authController),
  ],
  login: [validateBody(loginSchema), authController.login.bind(authController)],
  refreshToken: [
    validateBody(refreshTokenSchema),
    authController.refreshToken.bind(authController),
  ],
  logout: authController.logout.bind(authController),
  getProfile: authController.getProfile.bind(authController),
  updateProfile: [
    validateBody(updateProfileSchema),
    authController.updateProfile.bind(authController),
  ],
  changePassword: [
    validateBody(changePasswordSchema),
    authController.changePassword.bind(authController),
  ],
  getUserById: authController.getUserById.bind(authController),
  searchUsers: authController.searchUsers.bind(authController),
  validateToken: authController.validateToken.bind(authController),
};
