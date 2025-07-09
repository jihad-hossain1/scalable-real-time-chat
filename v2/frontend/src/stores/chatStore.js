import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "./authStore";
import toast from "react-hot-toast";

const useChatStore = create(
  immer((set, get) => ({
    // State
    conversations: new Map(),
    messages: new Map(), // conversationId -> Map(messageId -> message)
    activeConversationId: null,

    // Loading states
    isLoadingConversations: false,
    isLoadingMessages: false,
    isLoadingMoreMessages: false,
    isSendingMessage: false,

    // Error states
    conversationsError: null,
    messagesError: null,
    sendMessageError: null,

    // Pagination
    messagesPagination: new Map(), // conversationId -> { hasMore, nextCursor, isLoading }

    // Search
    searchQuery: "",
    searchResults: [],
    isSearching: false,
    searchError: null,

    // Draft messages
    draftMessages: new Map(), // conversationId -> draft content

    // Message selection (for actions like delete, forward)
    selectedMessages: new Set(),
    selectionMode: false,

    // Actions

    // Conversations
    loadConversations: async () => {
      try {
        set((draft) => {
          draft.isLoadingConversations = true;
          draft.conversationsError = null;
        });

        const conversations = (await chatService.getConversations()) || [];

        set((draft) => {
          draft?.conversations?.clear();
          conversations.forEach((conv) => {
            draft.conversations.set(conv.id, conv);
          });
          draft.isLoadingConversations = false;
        });
      } catch (error) {
        console.error("❌ Failed to load conversations:", error);
        set((draft) => {
          draft.isLoadingConversations = false;
          draft.conversationsError = error.message;
        });
        toast.error("Failed to load conversations");
      }
    },

    createConversation: async ({ userId, receiverId }) => {
      try {
        const conversation = await chatService.createConversation({
          conversationType: "direct",
          userId,
          receiverId,
        });
        console.log("🚀 ~ createConversation: ~ conversation:", conversation);

        set((draft) => {
          draft.conversations.set(conversation.id, conversation);
        });

        console.log("✅ Created conversation:", conversation.id);
        return conversation;
      } catch (error) {
        console.error("❌ Failed to create conversation:", error);
        toast.error("Failed to create conversation");
        throw error;
      }
    },

    updateConversation: async (conversationId, updates) => {
      try {
        const conversation = await chatService.updateConversation(
          conversationId,
          updates
        );

        set((draft) => {
          draft.conversations.set(conversationId, conversation);
        });

        console.log("✅ Updated conversation:", conversationId);
        return conversation;
      } catch (error) {
        console.error("❌ Failed to update conversation:", error);
        toast.error("Failed to update conversation");
        throw error;
      }
    },

    deleteConversation: async (conversationId) => {
      try {
        await chatService.deleteConversation(conversationId);

        set((draft) => {
          draft.conversations.delete(conversationId);
          draft.messages.delete(conversationId);
          draft.messagesPagination.delete(conversationId);
          draft.draftMessages.delete(conversationId);

          if (draft.activeConversationId === conversationId) {
            draft.activeConversationId = null;
          }
        });

        console.log("✅ Deleted conversation:", conversationId);
        toast.success("Conversation deleted");
      } catch (error) {
        console.error("❌ Failed to delete conversation:", error);
        toast.error("Failed to delete conversation");
        throw error;
      }
    },

    setActiveConversation: (conversationId) => {
      set((draft) => {
        draft.activeConversationId = conversationId;
        draft.selectedMessages.clear();
        draft.selectionMode = false;
      });

      // Load messages if not already loaded
      if (conversationId && !get().messages.has(conversationId)) {
        get().loadMessages(conversationId);
      }
    },

    // Messages
    loadMessages: async (conversationId, cursor = null) => {
      try {
        const isLoadingMore = !!cursor;

        set((draft) => {
          if (isLoadingMore) {
            draft.isLoadingMoreMessages = true;
          } else {
            draft.isLoadingMessages = true;
            draft.messagesError = null;
          }
        });

        const response = await chatService.getMessages(conversationId, {
          cursor,
          limit: 50,
        });

        set((draft) => {
          if (!draft.messages.has(conversationId)) {
            draft.messages.set(conversationId, new Map());
          }

          const conversationMessages = draft.messages.get(conversationId);

          response.messages.forEach((message) => {
            conversationMessages.set(message.id, message);
          });

          // Update pagination
          draft.messagesPagination.set(conversationId, {
            hasMore: response.hasMore,
            nextCursor: response.nextCursor,
            isLoading: false,
          });

          draft.isLoadingMessages = false;
          draft.isLoadingMoreMessages = false;
        });

        console.log(
          `📨 Loaded ${response.messages.length} messages for conversation ${conversationId}`
        );
      } catch (error) {
        console.error("❌ Failed to load messages:", error);
        set((draft) => {
          draft.isLoadingMessages = false;
          draft.isLoadingMoreMessages = false;
          draft.messagesError = error.message;
        });
        toast.error("Failed to load messages");
      }
    },

    sendMessage: async (conversationId, messageData) => {
      try {
        set((draft) => {
          draft.isSendingMessage = true;
          draft.sendMessageError = null;
        });

        // Create optimistic message
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          conversationId,
          senderId: useAuthStore.getState().user.id,
          content: messageData.content,
          type: messageData.type || "text",
          status: "sending",
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        };

        // Add optimistic message to store
        set((draft) => {
          if (!draft.messages.has(conversationId)) {
            draft.messages.set(conversationId, new Map());
          }

          const conversationMessages = draft.messages.get(conversationId);
          conversationMessages.set(optimisticMessage.id, optimisticMessage);
        });

        // Send message via socket
        const socketStore = await import("./socketStore");
        socketStore.useSocketStore.getState().sendMessage({
          conversationId,
          ...messageData,
        });

        // Clear draft
        set((draft) => {
          draft.draftMessages.delete(conversationId);
          draft.isSendingMessage = false;
        });

        console.log("📤 Sent message to conversation:", conversationId);
      } catch (error) {
        console.error("❌ Failed to send message:", error);

        // Remove optimistic message on error
        set((draft) => {
          const conversationMessages = draft.messages.get(conversationId);
          if (conversationMessages) {
            // Find and remove optimistic message
            for (const [id, message] of conversationMessages) {
              if (
                message.isOptimistic &&
                message.content === messageData.content
              ) {
                conversationMessages.delete(id);
                break;
              }
            }
          }

          draft.isSendingMessage = false;
          draft.sendMessageError = error.message;
        });

        toast.error("Failed to send message");
        throw error;
      }
    },

    editMessage: async (messageId, content) => {
      try {
        const socketStore = await import("./socketStore");
        socketStore.useSocketStore.getState().editMessage(messageId, content);

        console.log("📝 Editing message:", messageId);
      } catch (error) {
        console.error("❌ Failed to edit message:", error);
        toast.error("Failed to edit message");
        throw error;
      }
    },

    deleteMessage: async (messageId) => {
      try {
        const socketStore = await import("./socketStore");
        socketStore.useSocketStore.getState().deleteMessage(messageId);

        console.log("🗑️ Deleting message:", messageId);
      } catch (error) {
        console.error("❌ Failed to delete message:", error);
        toast.error("Failed to delete message");
        throw error;
      }
    },

    markMessageAsRead: async (messageId) => {
      try {
        const socketStore = await import("./socketStore");
        socketStore.useSocketStore.getState().markMessageAsRead(messageId);
      } catch (error) {
        console.error("❌ Failed to mark message as read:", error);
      }
    },

    // Real-time event handlers
    handleNewMessage: (message) => {
      set((draft) => {
        const { conversationId } = message;

        // Remove optimistic message if exists
        if (draft.messages.has(conversationId)) {
          const conversationMessages = draft.messages.get(conversationId);
          for (const [id, msg] of conversationMessages) {
            if (msg.isOptimistic && msg.content === message.content) {
              conversationMessages.delete(id);
              break;
            }
          }
        }

        // Add real message
        if (!draft.messages.has(conversationId)) {
          draft.messages.set(conversationId, new Map());
        }

        const conversationMessages = draft.messages.get(conversationId);
        conversationMessages.set(message.id, message);

        // Update conversation last message
        if (draft.conversations.has(conversationId)) {
          const conversation = draft.conversations.get(conversationId);
          conversation.lastMessage = message;
          conversation.lastMessageAt = message.createdAt;

          // Update unread count if not from current user
          const currentUserId = useAuthStore.getState().user?.id;
          if (message.senderId !== currentUserId) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
        }
      });

      // Auto-mark as read if conversation is active
      const state = get();
      if (state.activeConversationId === message.conversationId) {
        setTimeout(() => {
          get().markMessageAsRead(message.id);
        }, 1000);
      }
    },

    handleMessageUpdate: (updatedMessage) => {
      set((draft) => {
        const { conversationId } = updatedMessage;

        if (draft.messages.has(conversationId)) {
          const conversationMessages = draft.messages.get(conversationId);
          conversationMessages.set(updatedMessage.id, updatedMessage);
        }
      });
    },

    handleMessageDelete: (messageId) => {
      set((draft) => {
        // Find and remove message from all conversations
        for (const [conversationId, conversationMessages] of draft.messages) {
          if (conversationMessages.has(messageId)) {
            conversationMessages.delete(messageId);
            break;
          }
        }
      });
    },

    handleMessageStatusUpdate: (data) => {
      const { messageId, status, userId } = data;

      set((draft) => {
        // Find message and update status
        for (const [conversationId, conversationMessages] of draft.messages) {
          if (conversationMessages.has(messageId)) {
            const message = conversationMessages.get(messageId);

            if (!message.deliveryStatus) {
              message.deliveryStatus = {};
            }

            message.deliveryStatus[userId] = {
              status,
              timestamp: new Date().toISOString(),
            };

            // Update overall message status
            if (status === "read") {
              message.status = "read";
            } else if (status === "delivered" && message.status !== "read") {
              message.status = "delivered";
            }

            break;
          }
        }
      });
    },

    handleGroupUpdate: (updatedGroup) => {
      set((draft) => {
        if (draft.conversations.has(updatedGroup.id)) {
          const conversation = draft.conversations.get(updatedGroup.id);
          Object.assign(conversation, updatedGroup);
        }
      });
    },

    handleGroupMemberUpdate: (data) => {
      const { groupId, member, action } = data;

      set((draft) => {
        if (draft.conversations.has(groupId)) {
          const conversation = draft.conversations.get(groupId);

          if (action === "added") {
            if (!conversation.participants) {
              conversation.participants = [];
            }
            conversation.participants.push(member);
          } else if (action === "removed") {
            if (conversation.participants) {
              conversation.participants = conversation.participants.filter(
                (p) => p.id !== member.id
              );
            }
          }
        }
      });
    },

    // Search
    searchMessages: async (query) => {
      try {
        set((draft) => {
          draft.isSearching = true;
          draft.searchError = null;
          draft.searchQuery = query;
        });

        if (!query.trim()) {
          set((draft) => {
            draft.searchResults = [];
            draft.isSearching = false;
          });
          return;
        }

        const results = await chatService.searchMessages(query);

        set((draft) => {
          draft.searchResults = results;
          draft.isSearching = false;
        });

        console.log(`🔍 Found ${results.length} search results for: ${query}`);
      } catch (error) {
        console.error("❌ Search failed:", error);
        set((draft) => {
          draft.isSearching = false;
          draft.searchError = error.message;
        });
        toast.error("Search failed");
      }
    },

    clearSearch: () => {
      set((draft) => {
        draft.searchQuery = "";
        draft.searchResults = [];
        draft.searchError = null;
      });
    },

    // Draft messages
    saveDraft: (conversationId, content) => {
      set((draft) => {
        if (content.trim()) {
          draft.draftMessages.set(conversationId, content);
        } else {
          draft.draftMessages.delete(conversationId);
        }
      });
    },

    getDraft: (conversationId) => {
      return get().draftMessages.get(conversationId) || "";
    },

    clearDraft: (conversationId) => {
      set((draft) => {
        draft.draftMessages.delete(conversationId);
      });
    },

    // Message selection
    toggleMessageSelection: (messageId) => {
      set((draft) => {
        if (draft.selectedMessages.has(messageId)) {
          draft.selectedMessages.delete(messageId);
        } else {
          draft.selectedMessages.add(messageId);
        }

        // Exit selection mode if no messages selected
        if (draft.selectedMessages.size === 0) {
          draft.selectionMode = false;
        }
      });
    },

    enterSelectionMode: (messageId) => {
      set((draft) => {
        draft.selectionMode = true;
        draft.selectedMessages.clear();
        if (messageId) {
          draft.selectedMessages.add(messageId);
        }
      });
    },

    exitSelectionMode: () => {
      set((draft) => {
        draft.selectionMode = false;
        draft.selectedMessages.clear();
      });
    },

    deleteSelectedMessages: async () => {
      const state = get();
      const messageIds = Array.from(state.selectedMessages);

      try {
        await Promise.all(
          messageIds.map((messageId) => get().deleteMessage(messageId))
        );

        get().exitSelectionMode();
        toast.success(`Deleted ${messageIds.length} messages`);
      } catch (error) {
        console.error("❌ Failed to delete selected messages:", error);
        toast.error("Failed to delete some messages");
      }
    },

    // Getters
    getConversation: (conversationId) => {
      return get().conversations.get(conversationId);
    },

    getMessages: (conversationId) => {
      const messages = get().messages.get(conversationId);
      if (!messages) return [];

      return Array.from(messages.values()).sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    },

    getMessage: (conversationId, messageId) => {
      const messages = get().messages.get(conversationId);
      return messages?.get(messageId);
    },

    getConversationsList: () => {
      const conversations = Array.from(get().conversations.values());

      return conversations.sort((a, b) => {
        const aTime = new Date(a.lastMessageAt || a.createdAt);
        const bTime = new Date(b.lastMessageAt || b.createdAt);
        return bTime - aTime;
      });
    },

    getUnreadCount: () => {
      const conversations = get().conversations;
      let total = 0;

      for (const conversation of conversations.values()) {
        total += conversation.unreadCount || 0;
      }

      return total;
    },

    hasMoreMessages: (conversationId) => {
      const pagination = get().messagesPagination.get(conversationId);
      return pagination?.hasMore || false;
    },

    isLoadingMoreMessages: (conversationId) => {
      const pagination = get().messagesPagination.get(conversationId);
      return pagination?.isLoading || false;
    },
  }))
);

export { useChatStore };
