import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.eventListeners = new Map()
    this.connectionPromise = null
  }
  
  // Connect to socket server
  async connect(token) {
    if (this.socket && this.isConnected) {
      console.log('🔌 Socket already connected')
      return this.socket
    }
    
    if (this.connectionPromise) {
      console.log('🔌 Connection already in progress')
      return this.connectionPromise
    }
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
        
        console.log('🔌 Connecting to socket server:', socketUrl)
        
        this.socket = io(socketUrl, {
          auth: {
            token
          },
          transports: ['websocket', 'polling'],
          upgrade: true,
          rememberUpgrade: true,
          timeout: 20000,
          forceNew: false,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000,
          maxReconnectionAttempts: this.maxReconnectAttempts,
          randomizationFactor: 0.5
        })
        
        // Connection event handlers
        this.socket.on('connect', () => {
          console.log('✅ Socket connected:', this.socket.id)
          this.isConnected = true
          this.reconnectAttempts = 0
          this.connectionPromise = null
          resolve(this.socket)
        })
        
        this.socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error)
          this.isConnected = false
          this.connectionPromise = null
          reject(error)
        })
        
        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason)
          this.isConnected = false
          this.connectionPromise = null
          
          // Handle different disconnect reasons
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, try to reconnect
            console.log('🔄 Server disconnected, attempting to reconnect...')
          } else if (reason === 'io client disconnect') {
            // Client initiated disconnect, don't reconnect
            console.log('🔌 Client disconnected')
          } else {
            // Network issues, socket.io will handle reconnection
            console.log('🔄 Network disconnect, socket.io will handle reconnection')
          }
        })
        
        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`✅ Socket reconnected after ${attemptNumber} attempts`)
          this.isConnected = true
          this.reconnectAttempts = 0
        })
        
        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`🔄 Socket reconnection attempt ${attemptNumber}`)
          this.reconnectAttempts = attemptNumber
        })
        
        this.socket.on('reconnect_error', (error) => {
          console.error('❌ Socket reconnection error:', error)
        })
        
        this.socket.on('reconnect_failed', () => {
          console.error('❌ Socket reconnection failed after max attempts')
          this.isConnected = false
        })
        
        // Authentication events
        this.socket.on('authenticated', (data) => {
          console.log('✅ Socket authenticated:', data)
        })
        
        this.socket.on('auth_error', (error) => {
          console.error('❌ Socket authentication error:', error)
          this.disconnect()
          reject(new Error(`Authentication failed: ${error.message}`))
        })
        
        // Error handling
        this.socket.on('error', (error) => {
          console.error('❌ Socket error:', error)
        })
        
        // Restore event listeners
        this.restoreEventListeners()
        
      } catch (error) {
        console.error('❌ Socket connection setup failed:', error)
        this.connectionPromise = null
        reject(error)
      }
    })
    
    return this.connectionPromise
  }
  
  // Disconnect from socket server
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...')
      
      // Remove all listeners
      this.socket.removeAllListeners()
      
      // Disconnect
      this.socket.disconnect()
      
      this.socket = null
      this.isConnected = false
      this.connectionPromise = null
      
      console.log('✅ Socket disconnected')
    }
  }
  
  // Add event listener
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    
    this.eventListeners.get(event).add(callback)
    
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }
  
  // Remove event listener
  off(event, callback) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
      
      if (listeners.size === 0) {
        this.eventListeners.delete(event)
      }
    }
    
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }
  
  // Remove all listeners for an event
  removeAllListeners(event) {
    if (event) {
      this.eventListeners.delete(event)
      
      if (this.socket) {
        this.socket.removeAllListeners(event)
      }
    } else {
      this.eventListeners.clear()
      
      if (this.socket) {
        this.socket.removeAllListeners()
      }
    }
  }
  
  // Emit event
  emit(event, data, callback) {
    if (!this.socket || !this.isConnected) {
      console.warn(`⚠️ Cannot emit '${event}': socket not connected`)
      return false
    }
    
    if (callback) {
      this.socket.emit(event, data, callback)
    } else {
      this.socket.emit(event, data)
    }
    
    return true
  }
  
  // Emit with acknowledgment
  emitWithAck(event, data, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'))
        return
      }
      
      const timer = setTimeout(() => {
        reject(new Error(`Acknowledgment timeout for event: ${event}`))
      }, timeout)
      
      this.socket.emit(event, data, (response) => {
        clearTimeout(timer)
        
        if (response && response.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }
  
  // Join room
  joinRoom(roomId) {
    return this.emitWithAck('join_room', { roomId })
  }
  
  // Leave room
  leaveRoom(roomId) {
    return this.emitWithAck('leave_room', { roomId })
  }
  
  // Send message
  sendMessage(messageData) {
    return this.emitWithAck('send_message', messageData)
  }
  
  // Edit message
  editMessage(messageId, content) {
    return this.emitWithAck('edit_message', { messageId, content })
  }
  
  // Delete message
  deleteMessage(messageId) {
    return this.emitWithAck('delete_message', { messageId })
  }
  
  // Mark message as read
  markMessageAsRead(messageId) {
    this.emit('mark_message_read', { messageId })
  }
  
  // Typing indicators
  startTyping(conversationId, isGroup = false) {
    this.emit('start_typing', { conversationId, isGroup })
  }
  
  stopTyping(conversationId, isGroup = false) {
    this.emit('stop_typing', { conversationId, isGroup })
  }
  
  // Presence
  updatePresence(status) {
    this.emit('update_presence', { status })
  }
  
  // Group operations
  joinGroup(groupId) {
    return this.emitWithAck('join_group', { groupId })
  }
  
  leaveGroup(groupId) {
    return this.emitWithAck('leave_group', { groupId })
  }
  
  // Call operations
  initiateCall(callData) {
    return this.emitWithAck('call:initiate', callData)
  }
  
  acceptCall(callId) {
    return this.emitWithAck('call:accept', { callId })
  }
  
  rejectCall(callId) {
    return this.emitWithAck('call:reject', { callId })
  }
  
  endCall(callId) {
    return this.emitWithAck('call:end', { callId })
  }
  
  sendCallSignal(callId, signal) {
    this.emit('call:signal', { callId, signal })
  }
  
  sendIceCandidate(callId, candidate) {
    this.emit('call:ice-candidate', { callId, candidate })
  }
  
  // Ping for latency measurement
  ping() {
    const startTime = Date.now()
    
    return new Promise((resolve) => {
      this.socket.emit('ping', startTime, (timestamp) => {
        const latency = Date.now() - timestamp
        resolve(latency)
      })
    })
  }
  
  // Restore event listeners after reconnection
  restoreEventListeners() {
    if (!this.socket) return
    
    for (const [event, callbacks] of this.eventListeners) {
      for (const callback of callbacks) {
        this.socket.on(event, callback)
      }
    }
  }
  
  // Get connection state
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
      transport: this.socket?.io?.engine?.transport?.name || null
    }
  }
  
  // Check if socket is connected
  isSocketConnected() {
    return this.socket && this.isConnected && this.socket.connected
  }
  
  // Get socket instance (for advanced usage)
  getSocket() {
    return this.socket
  }
  
  // Force reconnection
  forceReconnect() {
    if (this.socket) {
      console.log('🔄 Forcing socket reconnection...')
      this.socket.disconnect().connect()
    }
  }
  
  // Update auth token
  updateAuthToken(token) {
    if (this.socket) {
      this.socket.auth.token = token
      
      // If connected, emit token update
      if (this.isConnected) {
        this.emit('update_token', { token })
      }
    }
  }
  
  // Get socket stats
  getStats() {
    if (!this.socket) {
      return null
    }
    
    return {
      id: this.socket.id,
      connected: this.socket.connected,
      disconnected: this.socket.disconnected,
      transport: this.socket.io.engine.transport.name,
      upgraded: this.socket.io.engine.upgraded,
      readyState: this.socket.io.engine.readyState,
      reconnectAttempts: this.reconnectAttempts,
      eventListeners: this.eventListeners.size
    }
  }
  
  // Cleanup
  cleanup() {
    this.removeAllListeners()
    this.disconnect()
    this.eventListeners.clear()
    this.reconnectAttempts = 0
    this.connectionPromise = null
  }
}

// Create singleton instance
const socketService = new SocketService()

// Handle page visibility changes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page is hidden, update presence to away
      if (socketService.isSocketConnected()) {
        socketService.updatePresence('away')
      }
    } else {
      // Page is visible, update presence to online
      if (socketService.isSocketConnected()) {
        socketService.updatePresence('online')
      }
    }
  })
}

// Handle beforeunload to gracefully disconnect
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (socketService.isSocketConnected()) {
      socketService.updatePresence('offline')
      socketService.disconnect()
    }
  })
}

// React hook for using socket service
export const useSocketService = () => {
  return socketService
}

export { socketService, SocketService }
export default socketService