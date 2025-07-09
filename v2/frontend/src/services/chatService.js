import { apiService } from "./apiService";

const chatService = {
  // Conversations
  getConversations: async (params = {}) => {
    try {
      const response = await apiService.paginated("/conversations", params);
      return response?.data || [];
    } catch (error) {
      console.error("❌ Get conversations failed:", error);
      throw error;
    }
  },

  getConversation: async (conversation_id) => {
    try {
      const response = await apiService.get(
        `/messages/conversations/${conversation_id}`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Get conversation failed:", error);
      throw error;
    }
  },

  createConversation: async (conversationData) => {
    try {
      const response = await apiService.post(
        "/messages/conversations",
        conversationData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Create conversation failed:", error);
      throw error;
    }
  },

  updateConversation: async (conversationId, updates) => {
    try {
      const response = await apiService.put(
        `/conversations/${conversationId}`,
        updates
      );
      return response.data;
    } catch (error) {
      console.error("❌ Update conversation failed:", error);
      throw error;
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      await apiService.delete(`/conversations/${conversationId}`);
    } catch (error) {
      console.error("❌ Delete conversation failed:", error);
      throw error;
    }
  },

  archiveConversation: async (conversationId) => {
    try {
      const response = await apiService.post(
        `/conversations/${conversationId}/archive`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Archive conversation failed:", error);
      throw error;
    }
  },

  unarchiveConversation: async (conversationId) => {
    try {
      const response = await apiService.post(
        `/conversations/${conversationId}/unarchive`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Unarchive conversation failed:", error);
      throw error;
    }
  },

  muteConversation: async (conversationId, duration) => {
    try {
      const response = await apiService.post(
        `/conversations/${conversationId}/mute`,
        {
          duration,
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Mute conversation failed:", error);
      throw error;
    }
  },

  unmuteConversation: async (conversationId) => {
    try {
      const response = await apiService.post(
        `/conversations/${conversationId}/unmute`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Unmute conversation failed:", error);
      throw error;
    }
  },

  pinConversation: async (conversationId) => {
    try {
      const response = await apiService.post(
        `/conversations/${conversationId}/pin`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Pin conversation failed:", error);
      throw error;
    }
  },

  unpinConversation: async (conversationId) => {
    try {
      const response = await apiService.post(
        `/conversations/${conversationId}/unpin`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Unpin conversation failed:", error);
      throw error;
    }
  },

  // Messages
  getMessages: async (conversationId, params = {}) => {
    try {
      const response = await apiService.get(
        `/conversations/${conversationId}/messages`,
        {
          params,
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Get messages failed:", error);
      throw error;
    }
  },

  getMessage: async (conversationId, messageId) => {
    try {
      const response = await apiService.get(
        `/conversations/${conversationId}/messages/${messageId}`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Get message failed:", error);
      throw error;
    }
  },

  sendMessage: async (conversationId, messageData) => {
    try {
      const response = await apiService.post(
        `/conversations/${conversationId}/messages`,
        messageData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Send message failed:", error);
      throw error;
    }
  },

  editMessage: async (conversationId, messageId, content) => {
    try {
      const response = await apiService.put(
        `/conversations/${conversationId}/messages/${messageId}`,
        {
          content,
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Edit message failed:", error);
      throw error;
    }
  },

  deleteMessage: async (conversationId, messageId) => {
    try {
      await apiService.delete(
        `/conversations/${conversationId}/messages/${messageId}`
      );
    } catch (error) {
      console.error("❌ Delete message failed:", error);
      throw error;
    }
  },

  markMessageAsRead: async (conversationId, messageId) => {
    try {
      await apiService.post(
        `/conversations/${conversationId}/messages/${messageId}/read`
      );
    } catch (error) {
      console.error("❌ Mark message as read failed:", error);
      throw error;
    }
  },

  markAllMessagesAsRead: async (conversationId) => {
    try {
      await apiService.post(
        `/conversations/${conversationId}/messages/read-all`
      );
    } catch (error) {
      console.error("❌ Mark all messages as read failed:", error);
      throw error;
    }
  },

  reactToMessage: async (conversationId, messageId, reaction) => {
    try {
      const response = await apiService.post(
        `/conversations/${conversationId}/messages/${messageId}/reactions`,
        { reaction }
      );
      return response.data;
    } catch (error) {
      console.error("❌ React to message failed:", error);
      throw error;
    }
  },

  removeReaction: async (conversationId, messageId, reaction) => {
    try {
      await apiService.delete(
        `/conversations/${conversationId}/messages/${messageId}/reactions/${reaction}`
      );
    } catch (error) {
      console.error("❌ Remove reaction failed:", error);
      throw error;
    }
  },

  forwardMessage: async (messageId, conversationIds) => {
    try {
      const response = await apiService.post("/messages/forward", {
        messageId,
        conversationIds,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Forward message failed:", error);
      throw error;
    }
  },

  // File uploads
  uploadFile: async (conversationId, file, onProgress) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiService.upload(
        `/conversations/${conversationId}/files`,
        formData,
        { onProgress }
      );

      return response.data;
    } catch (error) {
      console.error("❌ File upload failed:", error);
      throw error;
    }
  },

  uploadImage: async (conversationId, image, onProgress) => {
    try {
      const formData = new FormData();
      formData.append("image", image);

      const response = await apiService.upload(
        `/conversations/${conversationId}/images`,
        formData,
        { onProgress }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Image upload failed:", error);
      throw error;
    }
  },

  uploadAudio: async (conversationId, audio, onProgress) => {
    try {
      const formData = new FormData();
      formData.append("audio", audio);

      const response = await apiService.upload(
        `/conversations/${conversationId}/audio`,
        formData,
        { onProgress }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Audio upload failed:", error);
      throw error;
    }
  },

  // Search
  searchMessages: async (query, params = {}) => {
    try {
      const response = await apiService.search("/messages/search", query);
      console.log("🔍 Search messages response:", response);
      return response?.data || response || [];
    } catch (error) {
      console.error("❌ Search messages failed:", error);
      return [];
    }
  },

  searchConversations: async (query, params = {}) => {
    try {
      const response = await apiService.search("/conversations/search", query);
      console.log("🔍 Search conversations response:", response);
      return response?.data || response || [];
    } catch (error) {
      console.error("❌ Search conversations failed:", error);
      return [];
    }
  },

  // Groups
  createGroup: async (groupData) => {
    try {
      const response = await apiService.post("/groups", groupData);
      return response.data;
    } catch (error) {
      console.error("❌ Create group failed:", error);
      throw error;
    }
  },

  getGroup: async (groupId) => {
    try {
      const response = await apiService.get(`/groups/${groupId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Get group failed:", error);
      throw error;
    }
  },

  updateGroup: async (groupId, updates) => {
    try {
      const response = await apiService.put(`/groups/${groupId}`, updates);
      return response.data;
    } catch (error) {
      console.error("❌ Update group failed:", error);
      throw error;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await apiService.delete(`/groups/${groupId}`);
    } catch (error) {
      console.error("❌ Delete group failed:", error);
      throw error;
    }
  },

  uploadGroupAvatar: async (groupId, avatar, onProgress) => {
    try {
      const formData = new FormData();
      formData.append("avatar", avatar);

      const response = await apiService.upload(
        `/groups/${groupId}/avatar`,
        formData,
        { onProgress }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Group avatar upload failed:", error);
      throw error;
    }
  },

  deleteGroupAvatar: async (groupId) => {
    try {
      await apiService.delete(`/groups/${groupId}/avatar`);
    } catch (error) {
      console.error("❌ Delete group avatar failed:", error);
      throw error;
    }
  },

  // Group members
  getGroupMembers: async (groupId, params = {}) => {
    try {
      const response = await apiService.paginated(
        `/groups/${groupId}/members`,
        params
      );
      return response;
    } catch (error) {
      console.error("❌ Get group members failed:", error);
      throw error;
    }
  },

  addGroupMembers: async (groupId, userIds) => {
    try {
      const response = await apiService.post(`/groups/${groupId}/members`, {
        userIds,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Add group members failed:", error);
      throw error;
    }
  },

  removeGroupMember: async (groupId, userId) => {
    try {
      await apiService.delete(`/groups/${groupId}/members/${userId}`);
    } catch (error) {
      console.error("❌ Remove group member failed:", error);
      throw error;
    }
  },

  updateMemberRole: async (groupId, userId, role) => {
    try {
      const response = await apiService.put(
        `/groups/${groupId}/members/${userId}`,
        {
          role,
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Update member role failed:", error);
      throw error;
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await apiService.post(`/groups/${groupId}/leave`);
    } catch (error) {
      console.error("❌ Leave group failed:", error);
      throw error;
    }
  },

  // Group invites
  createGroupInvite: async (groupId, inviteData) => {
    try {
      const response = await apiService.post(
        `/groups/${groupId}/invites`,
        inviteData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Create group invite failed:", error);
      throw error;
    }
  },

  getGroupInvites: async (groupId) => {
    try {
      const response = await apiService.get(`/groups/${groupId}/invites`);
      return response.data;
    } catch (error) {
      console.error("❌ Get group invites failed:", error);
      throw error;
    }
  },

  revokeGroupInvite: async (groupId, inviteId) => {
    try {
      await apiService.delete(`/groups/${groupId}/invites/${inviteId}`);
    } catch (error) {
      console.error("❌ Revoke group invite failed:", error);
      throw error;
    }
  },

  joinGroupByInvite: async (inviteCode) => {
    try {
      const response = await apiService.post("/groups/join", {
        inviteCode,
      });
      return response.data;
    } catch (error) {
      console.error("❌ Join group by invite failed:", error);
      throw error;
    }
  },

  // Users
  searchUsers: async (query, params = {}) => {
    try {
      const response = await apiService.search("/users/search", query);
      console.log("🔍 Search users response:", response?.data);
      return response?.data || response || [];
    } catch (error) {
      console.error("❌ Search users failed:", error);
      return [];
    }
  },

  getUser: async (userId) => {
    try {
      const response = await apiService.get(`/users/${userId}`);
      console.log("🚀 ~ getUser: ~ response:", response);
      return response.data;
    } catch (error) {
      console.error("❌ Get user failed:", error);
      throw error;
    }
  },

  getUserProfile: async (userId) => {
    try {
      const response = await apiService.get(`/users/${userId}/profile`);
      return response.data;
    } catch (error) {
      console.error("❌ Get user profile failed:", error);
      throw error;
    }
  },

  // Contacts
  getContacts: async (params = {}) => {
    try {
      const response = await apiService.paginated("/contacts", params);
      return response;
    } catch (error) {
      console.error("❌ Get contacts failed:", error);
      throw error;
    }
  },

  addContact: async (userId) => {
    try {
      const response = await apiService.post("/contacts", { userId });
      return response.data;
    } catch (error) {
      console.error("❌ Add contact failed:", error);
      throw error;
    }
  },

  removeContact: async (userId) => {
    try {
      await apiService.delete(`/contacts/${userId}`);
    } catch (error) {
      console.error("❌ Remove contact failed:", error);
      throw error;
    }
  },

  // Blocked users
  getBlockedUsers: async (params = {}) => {
    try {
      const response = await apiService.paginated("/blocked-users", params);
      return response;
    } catch (error) {
      console.error("❌ Get blocked users failed:", error);
      throw error;
    }
  },

  blockUser: async (userId) => {
    try {
      const response = await apiService.post("/blocked-users", { userId });
      return response.data;
    } catch (error) {
      console.error("❌ Block user failed:", error);
      throw error;
    }
  },

  unblockUser: async (userId) => {
    try {
      await apiService.delete(`/blocked-users/${userId}`);
    } catch (error) {
      console.error("❌ Unblock user failed:", error);
      throw error;
    }
  },

  // Message drafts
  saveDraft: async (conversationId, content) => {
    try {
      const response = await apiService.post(
        `/conversations/${conversationId}/draft`,
        {
          content,
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Save draft failed:", error);
      throw error;
    }
  },

  getDraft: async (conversationId) => {
    try {
      const response = await apiService.get(
        `/conversations/${conversationId}/draft`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Get draft failed:", error);
      throw error;
    }
  },

  deleteDraft: async (conversationId) => {
    try {
      await apiService.delete(`/conversations/${conversationId}/draft`);
    } catch (error) {
      console.error("❌ Delete draft failed:", error);
      throw error;
    }
  },

  // Analytics
  getConversationStats: async (conversationId) => {
    try {
      const response = await apiService.get(
        `/conversations/${conversationId}/stats`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Get conversation stats failed:", error);
      throw error;
    }
  },

  getChatStats: async () => {
    try {
      const response = await apiService.get("/chat/stats");
      return response.data;
    } catch (error) {
      console.error("❌ Get chat stats failed:", error);
      throw error;
    }
  },

  // Export
  exportConversation: async (conversationId, format = "json") => {
    try {
      await apiService.download(
        `/conversations/${conversationId}/export?format=${format}`,
        `conversation-${conversationId}.${format}`
      );
    } catch (error) {
      console.error("❌ Export conversation failed:", error);
      throw error;
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await apiService.get("/chat/health");
      return response.data;
    } catch (error) {
      console.error("❌ Chat health check failed:", error);
      throw error;
    }
  },
};

export { chatService };
export default chatService;
