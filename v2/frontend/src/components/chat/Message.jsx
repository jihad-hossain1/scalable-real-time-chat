import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Edit3, Trash2, Reply, Copy, Download, Heart, ThumbsUp, Smile } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useChatStore } from '../../stores/chatStore'
import { formatTime, formatBytes, copyToClipboard } from '../../utils'
import { MESSAGE_TYPES } from '../../constants'

const Message = ({ message, showAvatar = true, isGrouped = false }) => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  
  const contextMenuRef = useRef(null)
  const editInputRef = useRef(null)
  
  const { user } = useAuthStore()
  const { editMessage, deleteMessage, reactToMessage } = useChatStore()
  
  const isOwn = message.senderId === user.id
  
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [isEditing])
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false)
      }
    }
    
    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showContextMenu])
  
  const handleContextMenu = (e) => {
    e.preventDefault()
    setShowContextMenu(true)
  }
  
  const handleEdit = () => {
    setIsEditing(true)
    setShowContextMenu(false)
  }
  
  const handleSaveEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      try {
        await editMessage(message.id, editContent.trim())
      } catch (error) {
        console.error('Failed to edit message:', error)
      }
    }
    setIsEditing(false)
    setEditContent(message.content)
  }
  
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(message.content)
  }
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(message.id)
      } catch (error) {
        console.error('Failed to delete message:', error)
      }
    }
    setShowContextMenu(false)
  }
  
  const handleReaction = async (emoji) => {
    try {
      await reactToMessage(message.id, emoji)
      setShowReactions(false)
    } catch (error) {
      console.error('Failed to react to message:', error)
    }
  }
  
  const handleCopy = () => {
    copyToClipboard(message.content)
    setShowContextMenu(false)
  }
  
  const handleDownload = () => {
    if (message.fileUrl) {
      const link = document.createElement('a')
      link.href = message.fileUrl
      link.download = message.content || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    setShowContextMenu(false)
  }
  
  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <div className="w-full">
          <textarea
            ref={editInputRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="
              w-full p-2 border border-gray-300 dark:border-gray-600 rounded
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500
              resize-none
            "
            rows={Math.min(editContent.split('\n').length, 5)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSaveEdit()
              } else if (e.key === 'Escape') {
                handleCancelEdit()
              }
            }}
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )
    }
    
    switch (message.type) {
      case MESSAGE_TYPES.TEXT:
        return (
          <div>
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
            {message.edited && (
              <span className="text-xs text-gray-400 italic mt-1 block">
                (edited)
              </span>
            )}
          </div>
        )
      
      case MESSAGE_TYPES.IMAGE:
        return (
          <div>
            <img
              src={message.fileUrl}
              alt="Shared image"
              className="rounded-lg max-w-full h-auto max-h-96 cursor-pointer"
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
            {message.content && (
              <p className="text-sm mt-2">{message.content}</p>
            )}
          </div>
        )
      
      case MESSAGE_TYPES.VIDEO:
        return (
          <div>
            <video
              src={message.fileUrl}
              controls
              className="rounded-lg max-w-full h-auto max-h-96"
            />
            {message.content && (
              <p className="text-sm mt-2">{message.content}</p>
            )}
          </div>
        )
      
      case MESSAGE_TYPES.AUDIO:
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="flex-1">
              <audio src={message.fileUrl} controls className="w-full" />
              {message.content && (
                <p className="text-sm mt-1">{message.content}</p>
              )}
            </div>
          </div>
        )
      
      case MESSAGE_TYPES.FILE:
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {message.content}
              </p>
              {message.fileSize && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatBytes(message.fileSize)}
                </p>
              )}
            </div>
            <button
              onClick={handleDownload}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )
      
      default:
        return (
          <p className="text-sm">{message.content}</p>
        )
    }
  }
  
  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null
    }
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(message.reactions).map(([emoji, users]) => {
          const hasReacted = users.some(u => u.id === user.id)
          return (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs
                ${hasReacted
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              <span className="mr-1">{emoji}</span>
              <span>{users.length}</span>
            </button>
          )
        })}
      </div>
    )
  }
  
  return (
    <div className={`group flex items-end space-x-2 mb-4 ${
      isOwn ? 'justify-end' : 'justify-start'
    }`}>
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <img
          src={message.sender?.avatar || '/default-avatar.png'}
          alt={message.sender?.username}
          className="w-8 h-8 rounded-full flex-shrink-0"
        />
      )}
      
      {/* Message Content */}
      <div className={`max-w-xs lg:max-w-md ${
        isOwn ? 'order-1' : 'order-2'
      }`}>
        {/* Sender name for group chats */}
        {!isOwn && !isGrouped && message.sender && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
            {message.sender.username}
          </p>
        )}
        
        {/* Message bubble */}
        <div
          onContextMenu={handleContextMenu}
          className={`
            relative px-4 py-2 rounded-2xl cursor-pointer
            ${isOwn
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
            }
          `}
        >
          {renderMessageContent()}
          
          {/* Message actions */}
          <div className={`
            absolute top-0 ${isOwn ? 'left-0' : 'right-0'} transform
            ${isOwn ? '-translate-x-full' : 'translate-x-full'}
            opacity-0 group-hover:opacity-100 transition-opacity
            flex items-center space-x-1 p-1
          `}>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <Smile className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleContextMenu}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Reactions */}
        {renderReactions()}
        
        {/* Reaction picker */}
        {showReactions && (
          <div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
            <div className="flex space-x-1">
              {['❤️', '👍', '👎', '😂', '😮', '😢', '😡'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Timestamp and status */}
        <div className={`flex items-center mt-1 space-x-2 text-xs text-gray-500 ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span className={`${
              message.status === 'read' ? 'text-blue-500' :
              message.status === 'delivered' ? 'text-gray-400' :
              'text-gray-300'
            }`}>
              {message.status === 'read' ? '✓✓' :
               message.status === 'delivered' ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
      
      {/* Context Menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className={`
            absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg
            border border-gray-200 dark:border-gray-700 py-1 min-w-[150px]
            ${isOwn ? 'right-0' : 'left-0'} top-8
          `}
        >
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <Heart className="w-4 h-4 mr-2" />
            React
          </button>
          
          <button
            onClick={() => {/* TODO: Implement reply */}}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </button>
          
          {message.type === MESSAGE_TYPES.TEXT && (
            <button
              onClick={handleCopy}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </button>
          )}
          
          {message.fileUrl && (
            <button
              onClick={handleDownload}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          )}
          
          {isOwn && message.type === MESSAGE_TYPES.TEXT && (
            <button
              onClick={handleEdit}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </button>
          )}
          
          {isOwn && (
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      )}
      
      {/* Click outside to close menus */}
      {(showContextMenu || showReactions) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowContextMenu(false)
            setShowReactions(false)
          }}
        />
      )}
    </div>
  )
}

export default Message