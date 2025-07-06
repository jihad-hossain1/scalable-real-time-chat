import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { socketService } from '@/services/socketService'
import { useAuthStore } from './authStore'
import { useChatStore } from './chatStore'
import { useNotificationStore } from './notificationStore'
import toast from 'react-hot-toast'

const useSocketStore = create(
  immer((set, get) => ({
    // State
    socket: null,
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    lastPing: null,
    latency: null,
    
    // Online users
    onlineUsers: new Map(),
    userTyping: new Map(), // userId -> { conversationId, timestamp }
    
    // Connection stats
    connectionStats: {
      connectTime: null,
      disconnectTime: null,
      totalReconnects: 0,
      messagesReceived: 0,
      messagesSent: 0
    },
    
    // Actions
    connect: async () => {
      const state = get()
      const authState = useAuthStore.getState()
      
      if (state.isConnected || state.isConnecting || !authState.isAuthenticated) {
        return
      }
      
      try {
        set((draft) => {
          draft.isConnecting = true
          draft.connectionError = null
        })
        
        console.log('🔌 Connecting to socket server...')
        
        const socket = await socketService.connect(authState.token)
        
        set((draft) => {
          draft.socket = socket
          draft.isConnected = true
          draft.isConnecting = false
          draft.reconnectAttempts = 0
          draft.connectionStats.connectTime = new Date().toISOString()
        })
        
        // Setup event listeners
        get().setupEventListeners()
        
        console.log('✅ Socket connected successfully')
        
        // Show connection toast only after reconnection
        if (state.reconnectAttempts > 0) {
          toast.success('Reconnected to chat server')
        }
        
      } catch (error) {
        console.error('❌ Socket connection failed:', error)
        
        set((draft) => {
          draft.isConnecting = false
          draft.connectionError = error.message
        })
        
        // Attempt reconnection
        get().scheduleReconnect()
      }
    },
    
    disconnect: () => {
      const state = get()
      
      if (state.socket) {
        console.log('🔌 Disconnecting from socket server...')
        
        socketService.disconnect()
        
        set((draft) => {
          draft.socket = null
          draft.isConnected = false
          draft.isConnecting = false
          draft.connectionError = null
          draft.onlineUsers.clear()
          draft.userTyping.clear()
          draft.connectionStats.disconnectTime = new Date().toISOString()
        })
        
        console.log('✅ Socket disconnected')
      }
    },
    
    scheduleReconnect: () => {
      const state = get()
      
      if (state.reconnectAttempts >= state.maxReconnectAttempts) {
        console.log('❌ Max reconnection attempts reached')
        toast.error('Unable to connect to chat server. Please refresh the page.')
        return
      }
      
      const delay = state.reconnectDelay * Math.pow(2, state.reconnectAttempts) // Exponential backoff
      
      console.log(`🔄 Scheduling reconnection attempt ${state.reconnectAttempts + 1} in ${delay}ms`)
      
      set((draft) => {
        draft.reconnectAttempts += 1
        draft.connectionStats.totalReconnects += 1
      })
      
      setTimeout(() => {
        const authState = useAuthStore.getState()
        if (authState.isAuthenticated && !get().isConnected) {
          get().connect()
        }
      }, delay)
    },
    
    setupEventListeners: () => {
      const state = get()
      const socket = state.socket
      
      if (!socket) return
      
      // Connection events
      socket.on('connect', () => {
        console.log('🔌 Socket connected')
        set((draft) => {
          draft.isConnected = true
          draft.isConnecting = false
          draft.connectionError = null
          draft.reconnectAttempts = 0
        })
      })
      
      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason)
        set((draft) => {
          draft.isConnected = false
          draft.connectionStats.disconnectTime = new Date().toISOString()
        })
        
        // Auto-reconnect unless it was a manual disconnect
        if (reason !== 'io client disconnect') {
          get().scheduleReconnect()
        }
      })
      
      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
        set((draft) => {
          draft.connectionError = error.message
          draft.isConnecting = false
        })
      })
      
      // Authentication events
      socket.on('auth_error', (error) => {
        console.error('❌ Socket authentication error:', error)
        toast.error('Authentication failed. Please log in again.')
        useAuthStore.getState().logout()
      })
      
      // Message events
      socket.on('new_message', (message) => {
        console.log('📨 New message received:', message)
        set((draft) => {
          draft.connectionStats.messagesReceived += 1
        })
        useChatStore.getState().handleNewMessage(message)
      })
      
      socket.on('message_updated', (message) => {
        console.log('📝 Message updated:', message)
        useChatStore.getState().handleMessageUpdate(message)
      })
      
      socket.on('message_deleted', (messageId) => {
        console.log('🗑️ Message deleted:', messageId)
        useChatStore.getState().handleMessageDelete(messageId)
      })
      
      socket.on('message_status_updated', (data) => {
        console.log('✅ Message status updated:', data)
        useChatStore.getState().handleMessageStatusUpdate(data)
      })
      
      // Typing events
      socket.on('user_typing', (data) => {
        get().handleUserTyping(data)
      })
      
      socket.on('user_stopped_typing', (data) => {
        get().handleUserStoppedTyping(data)
      })
      
      // Presence events
      socket.on('user_online', (userId) => {
        console.log('👤 User came online:', userId)
        set((draft) => {
          draft.onlineUsers.set(userId, {
            status: 'online',
            lastSeen: new Date().toISOString()
          })
        })
      })
      
      socket.on('user_offline', (userId) => {
        console.log('👤 User went offline:', userId)
        set((draft) => {
          draft.onlineUsers.set(userId, {
            status: 'offline',
            lastSeen: new Date().toISOString()
          })
        })
      })
      
      socket.on('online_users', (users) => {
        console.log('👥 Online users updated:', users)
        set((draft) => {
          draft.onlineUsers.clear()
          users.forEach(user => {
            draft.onlineUsers.set(user.id, {
              status: 'online',
              lastSeen: user.lastSeen
            })
          })
        })
      })
      
      // Group events
      socket.on('group_updated', (group) => {
        console.log('👥 Group updated:', group)
        useChatStore.getState().handleGroupUpdate(group)
      })
      
      socket.on('group_member_added', (data) => {
        console.log('👥 Group member added:', data)
        useChatStore.getState().handleGroupMemberUpdate(data)
      })
      
      socket.on('group_member_removed', (data) => {
        console.log('👥 Group member removed:', data)
        useChatStore.getState().handleGroupMemberUpdate(data)
      })
      
      // Notification events
      socket.on('new_notification', (notification) => {
        console.log('🔔 New notification:', notification)
        useNotificationStore.getState().handleNewNotification(notification)
      })
      
      // Ping/Pong for latency measurement
      socket.on('pong', (timestamp) => {
        const latency = Date.now() - timestamp
        set((draft) => {
          draft.lastPing = new Date().toISOString()
          draft.latency = latency
        })
      })
      
      // Error events
      socket.on('error', (error) => {
        console.error('❌ Socket error:', error)
        toast.error(error.message || 'Socket error occurred')
      })
    },
    
    // Message actions
    sendMessage: (messageData) => {
      const state = get()
      
      if (!state.socket || !state.isConnected) {
        throw new Error('Socket not connected')
      }
      
      console.log('📤 Sending message:', messageData)
      state.socket.emit('send_message', messageData)
      
      set((draft) => {
        draft.connectionStats.messagesSent += 1
      })
    },
    
    editMessage: (messageId, content) => {
      const state = get()
      
      if (!state.socket || !state.isConnected) {
        throw new Error('Socket not connected')
      }
      
      console.log('📝 Editing message:', messageId)
      state.socket.emit('edit_message', { messageId, content })
    },
    
    deleteMessage: (messageId) => {
      const state = get()
      
      if (!state.socket || !state.isConnected) {
        throw new Error('Socket not connected')
      }
      
      console.log('🗑️ Deleting message:', messageId)
      state.socket.emit('delete_message', { messageId })
    },
    
    markMessageAsRead: (messageId) => {
      const state = get()
      
      if (!state.socket || !state.isConnected) {
        return
      }
      
      state.socket.emit('mark_message_read', { messageId })
    },
    
    // Typing actions
    startTyping: (conversationId, isGroup = false) => {
      const state = get()
      
      if (!state.socket || !state.isConnected) {
        return
      }
      
      state.socket.emit('start_typing', { conversationId, isGroup })
    },
    
    stopTyping: (conversationId, isGroup = false) => {
      const state = get()
      
      if (!state.socket || !state.isConnected) {
        return
      }
      
      state.socket.emit('stop_typing', { conversationId, isGroup })
    },
    
    handleUserTyping: (data) => {
      const { userId, conversationId } = data
      
      set((draft) => {
        draft.userTyping.set(userId, {
          conversationId,
          timestamp: Date.now()
        })
      })
      
      // Auto-remove typing indicator after 3 seconds
      setTimeout(() => {
        set((draft) => {
          const typing = draft.userTyping.get(userId)
          if (typing && typing.timestamp === data.timestamp) {
            draft.userTyping.delete(userId)
          }
        })
      }, 3000)
    },
    
    handleUserStoppedTyping: (data) => {
      const { userId } = data
      
      set((draft) => {
        draft.userTyping.delete(userId)
      })
    },
    
    // Group actions
    joinGroup: (groupId) => {
      const state = get()
      
      if (!state.socket || !state.isConnected) {
        throw new Error('Socket not connected')
      }
      
      console.log('👥 Joining group:', groupId)
      state.socket.emit('join_group', { groupId })
    },
    
    leaveGroup: (groupId) => {
      const state = get()
      
      if (!state.socket || !state.isConnected) {
        throw new Error('Socket not connected')
      }
      
      console.log('👥 Leaving group:', groupId)
      state.socket.emit('leave_group', { groupId })
    },
    
    // Utility actions
    ping: () => {
      const state = get()
      
      if (!state.socket || !state.isConnected) {
        return
      }
      
      state.socket.emit('ping', Date.now())
    },
    
    // Getters
    isUserOnline: (userId) => {
      const state = get()
      const user = state.onlineUsers.get(userId)
      return user?.status === 'online'
    },
    
    isUserTyping: (userId, conversationId) => {
      const state = get()
      const typing = state.userTyping.get(userId)
      return typing?.conversationId === conversationId
    },
    
    getTypingUsers: (conversationId) => {
      const state = get()
      const typingUsers = []
      
      state.userTyping.forEach((typing, userId) => {
        if (typing.conversationId === conversationId) {
          typingUsers.push(userId)
        }
      })
      
      return typingUsers
    },
    
    getConnectionStats: () => {
      const state = get()
      return {
        ...state.connectionStats,
        isConnected: state.isConnected,
        latency: state.latency,
        reconnectAttempts: state.reconnectAttempts
      }
    }
  }))
)

// Auto-ping every 30 seconds to measure latency
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useSocketStore.getState()
    if (state.isConnected) {
      state.ping()
    }
  }, 30000)
}

export { useSocketStore }