import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, Smile, MoreVertical, Search } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'
import { useSocketService } from '../../services/socketService'
import { formatTime, formatRelativeTime } from '../../utils'
import { MESSAGE_TYPES, TYPING_TIMEOUT } from '../../constants'
import CallControls from '../call/CallControls'

const ChatInterface = ({ conversationId }) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  
  const messagesEndRef = useRef(null)
  const messageInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  
  const { user } = useAuthStore()
  const {
    messages,
    currentConversation,
    isLoading,
    sendMessage,
    loadMessages,
    markAsRead,
    editMessage,
    deleteMessage,
    reactToMessage
  } = useChatStore()
  
  const socketService = useSocketService()
  
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId)
      markAsRead(conversationId)
      
      // Join conversation room
      socketService.joinRoom(conversationId)
      
      // Set up socket listeners
      socketService.on('message:new', handleNewMessage)
      socketService.on('message:edited', handleMessageEdited)
      socketService.on('message:deleted', handleMessageDeleted)
      socketService.on('message:reaction', handleMessageReaction)
      socketService.on('typing:start', handleTypingStart)
      socketService.on('typing:stop', handleTypingStop)
      
      return () => {
        socketService.leaveRoom(conversationId)
        socketService.off('message:new', handleNewMessage)
        socketService.off('message:edited', handleMessageEdited)
        socketService.off('message:deleted', handleMessageDeleted)
        socketService.off('message:reaction', handleMessageReaction)
        socketService.off('typing:start', handleTypingStart)
        socketService.off('typing:stop', handleTypingStop)
      }
    }
  }, [conversationId])
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  const handleNewMessage = (newMessage) => {
    if (newMessage.conversationId === conversationId) {
      // Message will be added by the store
      scrollToBottom()
      
      // Mark as read if conversation is active
      if (document.hasFocus()) {
        markAsRead(conversationId)
      }
    }
  }
  
  const handleMessageEdited = (editedMessage) => {
    // Message will be updated by the store
  }
  
  const handleMessageDeleted = (deletedMessage) => {
    // Message will be removed by the store
  }
  
  const handleMessageReaction = (reaction) => {
    // Reaction will be updated by the store
  }
  
  const handleTypingStart = ({ userId, username }) => {
    if (userId !== user.id) {
      setTypingUsers(prev => {
        if (!prev.find(u => u.userId === userId)) {
          return [...prev, { userId, username }]
        }
        return prev
      })
    }
  }
  
  const handleTypingStop = ({ userId }) => {
    setTypingUsers(prev => prev.filter(u => u.userId !== userId))
  }
  
  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!message.trim() || !conversationId) return
    
    const messageData = {
      conversationId,
      content: message.trim(),
      type: MESSAGE_TYPES.TEXT
    }
    
    try {
      await sendMessage(messageData)
      setMessage('')
      stopTyping()
      messageInputRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }
  
  const handleInputChange = (e) => {
    setMessage(e.target.value)
    
    if (!isTyping) {
      startTyping()
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, TYPING_TIMEOUT)
  }
  
  const startTyping = () => {
    setIsTyping(true)
    socketService.startTyping(conversationId)
  }
  
  const stopTyping = () => {
    setIsTyping(false)
    socketService.stopTyping(conversationId)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }
  
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    files.forEach(file => {
      const messageData = {
        conversationId,
        content: file.name,
        type: getFileMessageType(file),
        file
      }
      
      sendMessage(messageData)
    })
    
    // Reset file input
    e.target.value = ''
    setShowAttachmentMenu(false)
  }
  
  const getFileMessageType = (file) => {
    if (file.type.startsWith('image/')) return MESSAGE_TYPES.IMAGE
    if (file.type.startsWith('video/')) return MESSAGE_TYPES.VIDEO
    if (file.type.startsWith('audio/')) return MESSAGE_TYPES.AUDIO
    return MESSAGE_TYPES.FILE
  }
  
  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
    messageInputRef.current?.focus()
  }
  
  const renderMessage = (msg) => {
    const isOwn = msg.senderId === user.id
    const showAvatar = !isOwn
    
    return (
      <div
        key={msg.id}
        className={`flex items-end space-x-2 mb-4 ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}
      >
        {showAvatar && (
          <img
            src={msg.sender?.avatar || '/default-avatar.png'}
            alt={msg.sender?.username}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        )}
        
        <div className={`max-w-xs lg:max-w-md ${
          isOwn ? 'order-1' : 'order-2'
        }`}>
          <div className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
          }`}>
            {msg.type === MESSAGE_TYPES.TEXT && (
              <p className="text-sm">{msg.content}</p>
            )}
            
            {msg.type === MESSAGE_TYPES.IMAGE && (
              <div>
                <img
                  src={msg.fileUrl}
                  alt="Shared image"
                  className="rounded-lg max-w-full h-auto"
                />
                {msg.content && (
                  <p className="text-sm mt-2">{msg.content}</p>
                )}
              </div>
            )}
            
            {msg.type === MESSAGE_TYPES.FILE && (
              <div className="flex items-center space-x-2">
                <Paperclip className="h-4 w-4" />
                <span className="text-sm">{msg.content}</span>
              </div>
            )}
          </div>
          
          <div className={`flex items-center mt-1 space-x-2 text-xs text-gray-500 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}>
            <span>{formatTime(msg.createdAt)}</span>
            {msg.edited && <span>• edited</span>}
            {isOwn && (
              <span className={`${
                msg.status === 'read' ? 'text-blue-500' :
                msg.status === 'delivered' ? 'text-gray-400' :
                'text-gray-300'
              }`}>
                {msg.status === 'read' ? '✓✓' :
                 msg.status === 'delivered' ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null
    
    return (
      <div className="flex items-center space-x-2 mb-4">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
        <span className="text-sm text-gray-500">
          {typingUsers.length === 1
            ? `${typingUsers[0].username} is typing...`
            : `${typingUsers.length} people are typing...`
          }
        </span>
      </div>
    )
  }
  
  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Select a conversation
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Choose a conversation from the sidebar to start chatting
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <img
            src={currentConversation?.avatar || '/default-avatar.png'}
            alt={currentConversation?.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {currentConversation?.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentConversation?.isOnline ? 'Online' : 
               currentConversation?.lastSeen ? 
               `Last seen ${formatRelativeTime(currentConversation.lastSeen)}` : 
               'Offline'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Call Controls */}
          {currentConversation?.type === 'direct' && currentConversation?.otherUserId && (
            <CallControls userId={currentConversation.otherUserId} />
          )}
          
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Search className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            {renderTypingIndicator()}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={message}
              onChange={handleInputChange}
              placeholder="Type a message..."
              rows={1}
              className="
                w-full px-4 py-2 pr-20 border border-gray-300 dark:border-gray-600
                rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder-gray-500 dark:placeholder-gray-400
                max-h-32 overflow-y-auto
              "
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
            
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <Smile className="h-5 w-5" />
              </button>
              
              <button
                type="button"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!message.trim()}
            className="
              p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        
        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        
        {/* Attachment Menu */}
        {showAttachmentMenu && (
          <div className="absolute bottom-16 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
            <button
              onClick={() => {
                fileInputRef.current?.click()
                setShowAttachmentMenu(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Upload File
            </button>
          </div>
        )}
        
        {/* Emoji Picker Placeholder */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-8 gap-2">
              {['😀', '😂', '😍', '🤔', '😢', '😡', '👍', '👎', '❤️', '🎉', '🔥', '💯'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatInterface