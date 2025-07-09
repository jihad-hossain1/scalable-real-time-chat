import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, users } from "../models/db.js";
import { eq } from "drizzle-orm";
import { redisService } from "./redis.js";
import dotenv from "dotenv";

dotenv.config();

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key";
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token
  generateToken(payload, expiresIn = this.jwtExpiresIn) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  // Register new user
  async register(userData) {
    const { username, email, password } = userData;

    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser?.length > 0) {
        throw new Error("User already exists with this email");
      }

      // Check username availability
      const existingUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUsername.length > 0) {
        throw new Error("Username is already taken");
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
        })
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          avatar: users.avatar,
          createdAt: users.createdAt,
        });

      const user = newUser[0];

      // Generate tokens
      const token = this.generateToken({ userId: user.id, email: user.email });
      const refreshToken = this.generateRefreshToken({ userId: user.id });

      // Store session in Redis
      await redisService.setUserSession(user.id, {
        token,
        refreshToken,
        loginTime: new Date().toISOString(),
      });

      return {
        user,
        token,
        refreshToken,
      };
    } catch (error) {
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Find user by email
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (userResult.length === 0) {
        throw new Error("Invalid email or password");
      }

      const user = userResult[0];

      // Verify password
      const isPasswordValid = await this.comparePassword(
        password,
        user.password
      );
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Generate tokens
      const token = this.generateToken({ userId: user.id, email: user.email });
      const refreshToken = this.generateRefreshToken({ userId: user.id });

      // Store session in Redis
      await redisService.setUserSession(user.id, {
        token,
        refreshToken,
        loginTime: new Date().toISOString(),
      });

      // Update user online status
      await db
        .update(users)
        .set({
          isOnline: true,
          lastSeen: new Date(),
        })
        .where(eq(users.id, user.id));

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token,
        refreshToken,
      };
    } catch (error) {
      throw error;
    }
  }

  // Refresh token
  async refreshToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);

      // Get user
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (userResult.length === 0) {
        throw new Error("User not found");
      }

      const user = userResult[0];

      // Generate new tokens
      const newToken = this.generateToken({
        userId: user.id,
        email: user.email,
      });
      const newRefreshToken = this.generateRefreshToken({ userId: user.id });

      // Update session in Redis
      await redisService.setUserSession(user.id, {
        token: newToken,
        refreshToken: newRefreshToken,
        loginTime: new Date().toISOString(),
      });

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  // Logout user
  async logout(userId) {
    try {
      // Update user offline status
      await db
        .update(users)
        .set({
          isOnline: false,
          lastSeen: new Date(),
        })
        .where(eq(users.id, userId));

      // Remove session from Redis
      await redisService.deleteUserSession(userId);
      await redisService.setUserOffline(userId);

      return { message: "Logged out successfully" };
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const userResult = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          avatar: users.avatar,
          isOnline: users.isOnline,
          lastSeen: users.lastSeen,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      console.log("🚀 ~ AuthService ~ getUserById ~ userResult:", userResult);

      return userResult.length > 0 ? userResult[0] : null;
    } catch (error) {
      console.error("Get user by ID error:", error);
      throw error;
    }
  }

  // Validate session
  async validateSession(token) {
    try {
      const decoded = this.verifyToken(token);

      // Check if session exists in Redis
      const session = await redisService.getUserSession(decoded.userId);
      if (!session || session.token !== token) {
        throw new Error("Invalid session");
      }

      const user = await this.getUserById(decoded.userId);
      if (!user) {
        throw new Error("User not found");
      }

      return { user, decoded };
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    try {
      const allowedFields = ["username", "avatar"];
      const filteredData = {};

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }

      if (Object.keys(filteredData).length === 0) {
        throw new Error("No valid fields to update");
      }

      filteredData.updatedAt = new Date();

      const updatedUser = await db
        .update(users)
        .set(filteredData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          avatar: users.avatar,
          isOnline: users.isOnline,
          lastSeen: users.lastSeen,
          updatedAt: users.updatedAt,
        });

      return updatedUser[0];
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with password
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        throw new Error("User not found");
      }

      const user = userResult[0];

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Invalidate all sessions
      await redisService.deleteUserSession(userId);

      return { message: "Password changed successfully" };
    } catch (error) {
      throw error;
    }
  }
}

export const authService = new AuthService();
