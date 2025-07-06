import { apiService } from "./apiService";

const authService = {
  // Token management
  setToken: (token) => {
    if (token) {
      localStorage.setItem("auth_token", token);
      console.log("✅ Token stored in localStorage");
    }
  },

  setAuthUser: (user) => {
    if (user) {
      localStorage.setItem("auth_user", JSON.stringify(user));
      console.log("✅ User stored in localStorage");
    }
  },
  setRefreshToken: (refreshToken) => {
    if (refreshToken) {
      localStorage.setItem("auth_refresh_token", refreshToken);
      console.log("✅ Refresh token stored in localStorage");
    }
  },

  clearTokens: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_user");
    console.log("✅ Tokens cleared from localStorage");
  },

  getStoredToken: () => {
    return localStorage.getItem("auth_token");
  },

  getStoredRefreshToken: () => {
    return localStorage.getItem("auth_refresh_token");
  },

  getStoredUser: () => {
    const user = localStorage.getItem("auth_user");
    return user ? JSON.parse(user) : null;
  },

  // Authentication
  login: async (credentials) => {
    try {
      const response = await apiService.post("/auth/login", credentials);
      return response.data;
    } catch (error) {
      console.error("❌ Login failed:", error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const response = await apiService.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      console.error("❌ Registration failed:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiService.post("/auth/logout");
      console.log("✅ Logged out successfully");
    } catch (error) {
      console.error("❌ Logout failed:", error);
      // Don't throw error for logout, just log it
    }
  },

  refreshToken: async (refreshToken) => {
    try {
      const response = await apiService.post("/auth/refresh", {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Token refresh failed:", error);
      throw error;
    }
  },

  // Password management
  changePassword: async (passwordData) => {
    try {
      const response = await apiService.post(
        "/auth/change-password",
        passwordData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Password change failed:", error);
      throw error;
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await apiService.post("/auth/forgot-password", {
        email,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Forgot password failed:", error);
      throw error;
    }
  },

  resetPassword: async (resetData) => {
    try {
      const response = await apiService.post("/auth/reset-password", resetData);
      return response.data;
    } catch (error) {
      console.error("❌ Password reset failed:", error);
      throw error;
    }
  },

  // Email verification
  sendVerificationEmail: async () => {
    try {
      const response = await apiService.post("/auth/send-verification");
      return response.data;
    } catch (error) {
      console.error("❌ Send verification email failed:", error);
      throw error;
    }
  },

  verifyEmail: async (token) => {
    try {
      const response = await apiService.post("/auth/verify-email", { token });
      return response.data;
    } catch (error) {
      console.error("❌ Email verification failed:", error);
      throw error;
    }
  },

  // Profile management
  getProfile: async () => {
    try {
      const response = await apiService.get("/auth/profile");
      return response.data;
    } catch (error) {
      console.error("❌ Get profile failed:", error);
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await apiService.put("/auth/profile", profileData);
      return response.data;
    } catch (error) {
      console.error("❌ Update profile failed:", error);
      throw error;
    }
  },

  uploadAvatar: async (file, onProgress) => {
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await apiService.upload("/auth/avatar", formData, {
        onProgress,
      });

      return response.data;
    } catch (error) {
      console.error("❌ Avatar upload failed:", error);
      throw error;
    }
  },

  deleteAvatar: async () => {
    try {
      const response = await apiService.delete("/auth/avatar");
      return response.data;
    } catch (error) {
      console.error("❌ Delete avatar failed:", error);
      throw error;
    }
  },

  // Account management
  deleteAccount: async (password) => {
    try {
      const response = await apiService.delete("/auth/account", {
        data: { password },
      });
      return response.data;
    } catch (error) {
      console.error("❌ Delete account failed:", error);
      throw error;
    }
  },

  deactivateAccount: async () => {
    try {
      const response = await apiService.post("/auth/deactivate");
      return response.data;
    } catch (error) {
      console.error("❌ Deactivate account failed:", error);
      throw error;
    }
  },

  reactivateAccount: async (credentials) => {
    try {
      const response = await apiService.post("/auth/reactivate", credentials);
      return response.data;
    } catch (error) {
      console.error("❌ Reactivate account failed:", error);
      throw error;
    }
  },

  // Session management
  getSessions: async () => {
    try {
      const response = await apiService.get("/auth/sessions");
      return response.data;
    } catch (error) {
      console.error("❌ Get sessions failed:", error);
      throw error;
    }
  },

  revokeSession: async (sessionId) => {
    try {
      const response = await apiService.delete(`/auth/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Revoke session failed:", error);
      throw error;
    }
  },

  revokeAllSessions: async () => {
    try {
      const response = await apiService.delete("/auth/sessions");
      return response.data;
    } catch (error) {
      console.error("❌ Revoke all sessions failed:", error);
      throw error;
    }
  },

  // Two-factor authentication
  enable2FA: async () => {
    try {
      const response = await apiService.post("/auth/2fa/enable");
      return response.data;
    } catch (error) {
      console.error("❌ Enable 2FA failed:", error);
      throw error;
    }
  },

  verify2FA: async (token, secret) => {
    try {
      const response = await apiService.post("/auth/2fa/verify", {
        token,
        secret,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Verify 2FA failed:", error);
      throw error;
    }
  },

  disable2FA: async (token) => {
    try {
      const response = await apiService.post("/auth/2fa/disable", { token });
      return response.data;
    } catch (error) {
      console.error("❌ Disable 2FA failed:", error);
      throw error;
    }
  },

  generateBackupCodes: async () => {
    try {
      const response = await apiService.post("/auth/2fa/backup-codes");
      return response.data;
    } catch (error) {
      console.error("❌ Generate backup codes failed:", error);
      throw error;
    }
  },

  // Privacy settings
  getPrivacySettings: async () => {
    try {
      const response = await apiService.get("/auth/privacy");
      return response.data;
    } catch (error) {
      console.error("❌ Get privacy settings failed:", error);
      throw error;
    }
  },

  updatePrivacySettings: async (settings) => {
    try {
      const response = await apiService.put("/auth/privacy", settings);
      return response.data;
    } catch (error) {
      console.error("❌ Update privacy settings failed:", error);
      throw error;
    }
  },

  // Blocked users
  getBlockedUsers: async () => {
    try {
      const response = await apiService.get("/auth/blocked-users");
      return response.data;
    } catch (error) {
      console.error("❌ Get blocked users failed:", error);
      throw error;
    }
  },

  blockUser: async (userId) => {
    try {
      const response = await apiService.post(`/auth/block/${userId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Block user failed:", error);
      throw error;
    }
  },

  unblockUser: async (userId) => {
    try {
      const response = await apiService.delete(`/auth/block/${userId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Unblock user failed:", error);
      throw error;
    }
  },

  // Activity and audit
  getLoginHistory: async (params = {}) => {
    try {
      const response = await apiService.paginated(
        "/auth/login-history",
        params
      );
      return response;
    } catch (error) {
      console.error("❌ Get login history failed:", error);
      throw error;
    }
  },

  getActivityLog: async (params = {}) => {
    try {
      const response = await apiService.paginated("/auth/activity", params);
      return response;
    } catch (error) {
      console.error("❌ Get activity log failed:", error);
      throw error;
    }
  },

  // Data export
  requestDataExport: async () => {
    try {
      const response = await apiService.post("/auth/export-data");
      return response.data;
    } catch (error) {
      console.error("❌ Request data export failed:", error);
      throw error;
    }
  },

  getDataExportStatus: async () => {
    try {
      const response = await apiService.get("/auth/export-data/status");
      return response.data;
    } catch (error) {
      console.error("❌ Get data export status failed:", error);
      throw error;
    }
  },

  downloadDataExport: async (exportId) => {
    try {
      await apiService.download(
        `/auth/export-data/${exportId}/download`,
        `data-export-${exportId}.zip`
      );
    } catch (error) {
      console.error("❌ Download data export failed:", error);
      throw error;
    }
  },

  // Validation helpers
  validateToken: async (token) => {
    try {
      const response = await apiService.post("/auth/validate", { token });
      return response.data;
    } catch (error) {
      console.error("❌ Token validation failed:", error);
      throw error;
    }
  },

  checkEmailAvailability: async (email) => {
    try {
      const response = await apiService.get("/auth/check-email", {
        params: { email },
      });
      return response.data;
    } catch (error) {
      console.error("❌ Email availability check failed:", error);
      throw error;
    }
  },

  checkUsernameAvailability: async (username) => {
    try {
      const response = await apiService.get("/auth/check-username", {
        params: { username },
      });
      return response.data;
    } catch (error) {
      console.error("❌ Username availability check failed:", error);
      throw error;
    }
  },

  // Rate limiting info
  getRateLimitInfo: async () => {
    try {
      const response = await apiService.get("/auth/rate-limit");
      return response.data;
    } catch (error) {
      console.error("❌ Get rate limit info failed:", error);
      throw error;
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await apiService.get("/auth/health");
      return response.data;
    } catch (error) {
      console.error("❌ Auth health check failed:", error);
      throw error;
    }
  },
};

export { authService };
export default authService;
