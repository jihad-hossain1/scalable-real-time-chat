import { useState, useEffect } from 'react'
import { Bell, X, Check, CheckCheck, Trash2, Settings, Filter } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'
import { formatRelativeTime, truncateText } from '../../utils'
import { NOTIFICATION_TYPES } from '../../constants'

const NotificationCenter = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState('all') // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all')
  
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    setFilter: setStoreFilter
  } = useNotificationStore()
  
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])
  
  useEffect(() => {
    setStoreFilter({ status: filter, type: typeFilter })
  }, [filter, typeFilter])
  
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }
  
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }
  
  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId)
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }
  
  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      try {
        await clearAllNotifications()
      } catch (error) {
        console.error('Failed to clear notifications:', error)
      }
    }
  }
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.MESSAGE:
        return '💬'
      case NOTIFICATION_TYPES.FRIEND_REQUEST:
        return '👥'
      case NOTIFICATION_TYPES.GROUP_INVITE:
        return '🏷️'
      case NOTIFICATION_TYPES.MENTION:
        return '@'
      case NOTIFICATION_TYPES.SYSTEM:
        return '⚙️'
      default:
        return '🔔'
    }
  }
  
  const getNotificationColor = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.MESSAGE:
        return 'bg-blue-100 dark:bg-blue-900'
      case NOTIFICATION_TYPES.FRIEND_REQUEST:
        return 'bg-green-100 dark:bg-green-900'
      case NOTIFICATION_TYPES.GROUP_INVITE:
        return 'bg-purple-100 dark:bg-purple-900'
      case NOTIFICATION_TYPES.MENTION:
        return 'bg-yellow-100 dark:bg-yellow-900'
      case NOTIFICATION_TYPES.SYSTEM:
        return 'bg-gray-100 dark:bg-gray-900'
      default:
        return 'bg-gray-100 dark:bg-gray-900'
    }
  }
  
  // Convert Map to array and then filter
  const notificationsArray = notifications ? Array.from(notifications.values()) : []
  const filteredNotifications = notificationsArray.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false
    if (filter === 'read' && !notification.isRead) return false
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false
    return true
  })
  
  const renderNotification = (notification) => {
    return (
      <div
        key={notification.id}
        className={`
          relative p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700
          ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
        `}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg
            ${getNotificationColor(notification.type)}
          `}>
            {getNotificationIcon(notification.type)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {truncateText(notification.message, 100)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {formatRelativeTime(notification.createdAt)}
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-1 ml-2">
                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={() => handleDelete(notification.id)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Action buttons for specific notification types */}
            {notification.actionUrl && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    // Handle notification action
                    window.open(notification.actionUrl, '_blank')
                    if (!notification.isRead) {
                      handleMarkAsRead(notification.id)
                    }
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  {notification.actionText || 'View'}
                </button>
              </div>
            )}
          </div>
          
          {/* Unread indicator */}
          {!notification.isRead && (
            <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full" />
          )}
        </div>
      </div>
    )
  }
  
  if (!isOpen) return null
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Filter tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'read', label: 'Read' }
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
          
          {/* Type filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="
                flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            >
              <option value="all">All Types</option>
              <option value={NOTIFICATION_TYPES.MESSAGE}>Messages</option>
              <option value={NOTIFICATION_TYPES.FRIEND_REQUEST}>Friend Requests</option>
              <option value={NOTIFICATION_TYPES.GROUP_INVITE}>Group Invites</option>
              <option value={NOTIFICATION_TYPES.MENTION}>Mentions</option>
              <option value={NOTIFICATION_TYPES.SYSTEM}>System</option>
            </select>
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark All Read
              </button>
            )}
            
            {notificationsArray.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredNotifications?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
              <Bell className="w-12 h-12 text-gray-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {filter === 'unread' ? 'No unread notifications' :
                 filter === 'read' ? 'No read notifications' :
                 'No notifications yet'
                }
              </p>
            </div>
          ) : (
            <div>
              {filteredNotifications?.map(renderNotification)}
              
              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={() => loadNotifications(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Load more notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              // TODO: Open notification settings
              console.log('Open notification settings')
            }}
            className="w-full flex items-center justify-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            Notification Settings
          </button>
        </div>
      </div>
    </>
  )
}

export default NotificationCenter