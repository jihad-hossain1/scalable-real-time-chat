import { useState, useEffect } from 'react'
import { Search, Plus, MoreVertical, Pin, Archive, Trash2, MessageSquare } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'
import { formatRelativeTime, truncateText } from '../../utils'
import { CONVERSATION_TYPES } from '../../constants'

const ConversationList = ({ onSelectConversation, selectedConversationId }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showContextMenu, setShowContextMenu] = useState(null)
  const [filter, setFilter] = useState('all') // all, unread, archived
  
  const { user } = useAuthStore()
  const {
    conversations,
    isLoading,
    loadConversations,
    searchConversations,
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
    pinConversation,
    unpinConversation,
    markAsRead
  } = useChatStore()
  
  useEffect(() => {
    loadConversations()
  }, [])
  
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchConversations(searchQuery)
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
  }, [searchQuery])
  
  const filteredConversations = conversations.filter(conversation => {
    switch (filter) {
      case 'unread':
        return conversation.unreadCount > 0
      case 'archived':
        return conversation.isArchived
      default:
        return !conversation.isArchived
    }
  })
  
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    // Pinned conversations first
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    
    // Then by last message time
    return new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
  })
  
  const handleConversationClick = (conversation) => {
    onSelectConversation(conversation.id)
    
    // Mark as read if it has unread messages
    if (conversation.unreadCount > 0) {
      markAsRead(conversation.id)
    }
  }
  
  const handleContextMenu = (e, conversationId) => {
    e.preventDefault()
    e.stopPropagation()
    setShowContextMenu(conversationId)
  }
  
  const handleContextMenuAction = async (action, conversationId) => {
    setShowContextMenu(null)
    
    try {
      switch (action) {
        case 'pin':
          await pinConversation(conversationId)
          break
        case 'unpin':
          await unpinConversation(conversationId)
          break
        case 'archive':
          await archiveConversation(conversationId)
          break
        case 'unarchive':
          await unarchiveConversation(conversationId)
          break
        case 'delete':
          if (window.confirm('Are you sure you want to delete this conversation?')) {
            await deleteConversation(conversationId)
          }
          break
        default:
          break
      }
    } catch (error) {
      console.error(`Failed to ${action} conversation:`, error)
    }
  }
  
  const getConversationName = (conversation) => {
    if (conversation.type === CONVERSATION_TYPES.GROUP) {
      return conversation.name
    }
    
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants?.find(p => p.id !== user.id)
    return otherParticipant?.username || 'Unknown User'
  }
  
  const getConversationAvatar = (conversation) => {
    if (conversation.type === CONVERSATION_TYPES.GROUP) {
      return conversation.avatar || '/default-group-avatar.png'
    }
    
    const otherParticipant = conversation.participants?.find(p => p.id !== user.id)
    return otherParticipant?.avatar || '/default-avatar.png'
  }
  
  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) {
      return 'No messages yet'
    }
    
    const { content, type, senderId } = conversation.lastMessage
    const senderName = senderId === user.id ? 'You' : 
      conversation.participants?.find(p => p.id === senderId)?.username || 'Someone'
    
    switch (type) {
      case 'image':
        return `${senderName}: 📷 Photo`
      case 'video':
        return `${senderName}: 🎥 Video`
      case 'audio':
        return `${senderName}: 🎵 Audio`
      case 'file':
        return `${senderName}: 📎 File`
      default:
        return `${senderName}: ${truncateText(content, 50)}`
    }
  }
  
  const renderConversation = (conversation) => {
    const isSelected = conversation.id === selectedConversationId
    const isOnline = conversation.type === CONVERSATION_TYPES.DIRECT && 
      conversation.participants?.find(p => p.id !== user.id)?.isOnline
    
    return (
      <div
        key={conversation.id}
        onClick={() => handleConversationClick(conversation)}
        onContextMenu={(e) => handleContextMenu(e, conversation.id)}
        className={`
          relative flex items-center p-3 cursor-pointer transition-colors duration-200
          hover:bg-gray-50 dark:hover:bg-gray-700
          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''}
        `}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={getConversationAvatar(conversation)}
            alt={getConversationName(conversation)}
            className="w-12 h-12 rounded-full object-cover"
          />
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
          )}
          {conversation.isPinned && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <Pin className="w-2 h-2 text-white" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 ml-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium truncate ${
              conversation.unreadCount > 0 
                ? 'text-gray-900 dark:text-white' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {getConversationName(conversation)}
            </h3>
            
            <div className="flex items-center space-x-1">
              {conversation.lastMessageAt && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(conversation.lastMessageAt)}
                </span>
              )}
              
              <button
                onClick={(e) => handleContextMenu(e, conversation.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className={`text-sm truncate ${
              conversation.unreadCount > 0
                ? 'text-gray-900 dark:text-white font-medium'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {getLastMessagePreview(conversation)}
            </p>
            
            {conversation.unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-full min-w-[20px] text-center">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
        
        {/* Context Menu */}
        {showContextMenu === conversation.id && (
          <div className="absolute right-2 top-12 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[150px]">
            <button
              onClick={() => handleContextMenuAction(
                conversation.isPinned ? 'unpin' : 'pin',
                conversation.id
              )}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <Pin className="w-4 h-4 mr-2" />
              {conversation.isPinned ? 'Unpin' : 'Pin'}
            </button>
            
            <button
              onClick={() => handleContextMenuAction(
                conversation.isArchived ? 'unarchive' : 'archive',
                conversation.id
              )}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <Archive className="w-4 h-4 mr-2" />
              {conversation.isArchived ? 'Unarchive' : 'Archive'}
            </button>
            
            <button
              onClick={() => handleContextMenuAction('delete', conversation.id)}
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chats
          </h2>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
            "
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="flex mt-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'archived', label: 'Archived' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`
                flex-1 py-1 px-3 text-sm font-medium rounded-md transition-colors
                ${filter === tab.key
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <MessageSquare className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {filter === 'unread' ? 'No unread conversations' :
               filter === 'archived' ? 'No archived conversations' :
               searchQuery ? 'No conversations found' : 'No conversations yet'
              }
            </p>
          </div>
        ) : (
          <div className="group">
            {sortedConversations.map(renderConversation)}
          </div>
        )}
      </div>
      
      {/* Click outside to close context menu */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowContextMenu(null)}
        />
      )}
    </div>
  )
}

export default ConversationList