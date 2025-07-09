import { apiService } from "./apiService";

const notificationService = {
  // Get notifications
  getNotifications: async (params = {}) => {
    try {
      const response = await apiService.get("/notifications", {
        params,
      });
      return response.data?.notifications || [];
    } catch (error) {
      console.error("❌ Get notifications failed:", error);
      throw error;
    }
  },

  // Get notification by ID
  getNotification: async (notificationId) => {
    try {
      const response = await apiService.get(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Get notification failed:", error);
      throw error;
    }
  },

  // Mark notifications as read
  markAsRead: async (notificationIds) => {
    try {
      const response = await apiService.post("/notifications/read", {
        notificationIds: Array.isArray(notificationIds)
          ? notificationIds
          : [notificationIds],
      });
      return response.data;
    } catch (error) {
      console.error("❌ Mark notifications as read failed:", error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await apiService.post("/notifications/read-all");
      return response.data;
    } catch (error) {
      console.error("❌ Mark all notifications as read failed:", error);
      throw error;
    }
  },

  // Delete notifications
  deleteNotifications: async (notificationIds) => {
    try {
      await apiService.delete("/notifications", {
        data: {
          notificationIds: Array.isArray(notificationIds)
            ? notificationIds
            : [notificationIds],
        },
      });
    } catch (error) {
      console.error("❌ Delete notifications failed:", error);
      throw error;
    }
  },

  // Clear all notifications
  clearAll: async () => {
    try {
      await apiService.delete("/notifications/all");
    } catch (error) {
      console.error("❌ Clear all notifications failed:", error);
      throw error;
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      const response = await apiService.get("/notifications/unread-count");
      return response.data;
    } catch (error) {
      console.error("❌ Get unread count failed:", error);
      throw error;
    }
  },

  // Notification preferences
  getPreferences: async () => {
    try {
      const response = await apiService.get("/notifications/preferences");
      return response.data;
    } catch (error) {
      console.error("❌ Get notification preferences failed:", error);
      throw error;
    }
  },

  updatePreferences: async (preferences) => {
    try {
      const response = await apiService.put(
        "/notifications/preferences",
        preferences
      );
      return response.data;
    } catch (error) {
      console.error("❌ Update notification preferences failed:", error);
      throw error;
    }
  },

  // Push notification subscription
  subscribeToPush: async (subscription) => {
    try {
      const response = await apiService.post("/notifications/push/subscribe", {
        subscription,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Subscribe to push notifications failed:", error);
      throw error;
    }
  },

  unsubscribeFromPush: async (endpoint) => {
    try {
      await apiService.post("/notifications/push/unsubscribe", {
        endpoint,
      });
    } catch (error) {
      console.error("❌ Unsubscribe from push notifications failed:", error);
      throw error;
    }
  },

  // Test notifications
  sendTestNotification: async (type = "test") => {
    try {
      const response = await apiService.post("/notifications/test", {
        type,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Send test notification failed:", error);
      throw error;
    }
  },

  // Notification templates
  getTemplates: async () => {
    try {
      const response = await apiService.get("/notifications/templates");
      return response.data;
    } catch (error) {
      console.error("❌ Get notification templates failed:", error);
      throw error;
    }
  },

  // Notification history
  getHistory: async (params = {}) => {
    try {
      const response = await apiService.paginated(
        "/notifications/history",
        params
      );
      return response;
    } catch (error) {
      console.error("❌ Get notification history failed:", error);
      throw error;
    }
  },

  // Notification statistics
  getStats: async (params = {}) => {
    try {
      const response = await apiService.get("/notifications/stats", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Get notification stats failed:", error);
      throw error;
    }
  },

  // Snooze notifications
  snoozeNotification: async (notificationId, duration) => {
    try {
      const response = await apiService.post(
        `/notifications/${notificationId}/snooze`,
        {
          duration,
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Snooze notification failed:", error);
      throw error;
    }
  },

  unsnoozeNotification: async (notificationId) => {
    try {
      const response = await apiService.post(
        `/notifications/${notificationId}/unsnooze`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Unsnooze notification failed:", error);
      throw error;
    }
  },

  // Notification channels
  getChannels: async () => {
    try {
      const response = await apiService.get("/notifications/channels");
      return response.data;
    } catch (error) {
      console.error("❌ Get notification channels failed:", error);
      throw error;
    }
  },

  updateChannelSettings: async (channelId, settings) => {
    try {
      const response = await apiService.put(
        `/notifications/channels/${channelId}`,
        settings
      );
      return response.data;
    } catch (error) {
      console.error("❌ Update channel settings failed:", error);
      throw error;
    }
  },

  // Notification rules
  getRules: async () => {
    try {
      const response = await apiService.get("/notifications/rules");
      return response.data;
    } catch (error) {
      console.error("❌ Get notification rules failed:", error);
      throw error;
    }
  },

  createRule: async (ruleData) => {
    try {
      const response = await apiService.post("/notifications/rules", ruleData);
      return response.data;
    } catch (error) {
      console.error("❌ Create notification rule failed:", error);
      throw error;
    }
  },

  updateRule: async (ruleId, updates) => {
    try {
      const response = await apiService.put(
        `/notifications/rules/${ruleId}`,
        updates
      );
      return response.data;
    } catch (error) {
      console.error("❌ Update notification rule failed:", error);
      throw error;
    }
  },

  deleteRule: async (ruleId) => {
    try {
      await apiService.delete(`/notifications/rules/${ruleId}`);
    } catch (error) {
      console.error("❌ Delete notification rule failed:", error);
      throw error;
    }
  },

  // Notification scheduling
  scheduleNotification: async (notificationData) => {
    try {
      const response = await apiService.post(
        "/notifications/schedule",
        notificationData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Schedule notification failed:", error);
      throw error;
    }
  },

  getScheduledNotifications: async (params = {}) => {
    try {
      const response = await apiService.paginated(
        "/notifications/scheduled",
        params
      );
      return response;
    } catch (error) {
      console.error("❌ Get scheduled notifications failed:", error);
      throw error;
    }
  },

  cancelScheduledNotification: async (notificationId) => {
    try {
      await apiService.delete(`/notifications/scheduled/${notificationId}`);
    } catch (error) {
      console.error("❌ Cancel scheduled notification failed:", error);
      throw error;
    }
  },

  // Notification delivery status
  getDeliveryStatus: async (notificationId) => {
    try {
      const response = await apiService.get(
        `/notifications/${notificationId}/delivery-status`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Get delivery status failed:", error);
      throw error;
    }
  },

  // Bulk operations
  bulkMarkAsRead: async (filters = {}) => {
    try {
      const response = await apiService.post(
        "/notifications/bulk/read",
        filters
      );
      return response.data;
    } catch (error) {
      console.error("❌ Bulk mark as read failed:", error);
      throw error;
    }
  },

  bulkDelete: async (filters = {}) => {
    try {
      await apiService.post("/notifications/bulk/delete", filters);
    } catch (error) {
      console.error("❌ Bulk delete failed:", error);
      throw error;
    }
  },

  // Export notifications
  exportNotifications: async (params = {}) => {
    try {
      const { format = "json", ...otherParams } = params;
      await apiService.download(
        `/notifications/export?format=${format}`,
        `notifications.${format}`,
        { params: otherParams }
      );
    } catch (error) {
      console.error("❌ Export notifications failed:", error);
      throw error;
    }
  },

  // Notification digest
  getDigest: async (period = "daily") => {
    try {
      const response = await apiService.get("/notifications/digest", {
        params: { period },
      });
      return response.data;
    } catch (error) {
      console.error("❌ Get notification digest failed:", error);
      throw error;
    }
  },

  updateDigestSettings: async (settings) => {
    try {
      const response = await apiService.put(
        "/notifications/digest/settings",
        settings
      );
      return response.data;
    } catch (error) {
      console.error("❌ Update digest settings failed:", error);
      throw error;
    }
  },

  // Notification categories
  getCategories: async () => {
    try {
      const response = await apiService.get("/notifications/categories");
      return response.data;
    } catch (error) {
      console.error("❌ Get notification categories failed:", error);
      throw error;
    }
  },

  updateCategorySettings: async (categoryId, settings) => {
    try {
      const response = await apiService.put(
        `/notifications/categories/${categoryId}`,
        settings
      );
      return response.data;
    } catch (error) {
      console.error("❌ Update category settings failed:", error);
      throw error;
    }
  },

  // Device management
  getDevices: async () => {
    try {
      const response = await apiService.get("/notifications/devices");
      return response.data;
    } catch (error) {
      console.error("❌ Get notification devices failed:", error);
      throw error;
    }
  },

  registerDevice: async (deviceData) => {
    try {
      const response = await apiService.post(
        "/notifications/devices",
        deviceData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Register device failed:", error);
      throw error;
    }
  },

  updateDevice: async (deviceId, updates) => {
    try {
      const response = await apiService.put(
        `/notifications/devices/${deviceId}`,
        updates
      );
      return response.data;
    } catch (error) {
      console.error("❌ Update device failed:", error);
      throw error;
    }
  },

  unregisterDevice: async (deviceId) => {
    try {
      await apiService.delete(`/notifications/devices/${deviceId}`);
    } catch (error) {
      console.error("❌ Unregister device failed:", error);
      throw error;
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await apiService.get("/notifications/health");
      return response.data;
    } catch (error) {
      console.error("❌ Notification health check failed:", error);
      throw error;
    }
  },
};

export { notificationService };
export default notificationService;
