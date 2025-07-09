import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { notificationService } from '@/services/notificationService'
import toast from 'react-hot-toast'

const useNotificationStore = create(
  immer((set, get) => ({
    // State
    notifications: new Map(),
    unreadCount: 0,
    
    // Loading states
    isLoading: false,
    isLoadingMore: false,
    isMarkingAsRead: false,
    
    // Error states
    error: null,
    
    // Pagination
    hasMore: true,
    nextCursor: null,
    
    // Filters
    filter: 'all', // 'all', 'unread', 'read'
    typeFilter: 'all', // 'all', 'message', 'group', 'system'
    
    // Preferences
    preferences: {
      enabled: true,
      sound: true,
      desktop: true,
      email: true,
      push: true,
      messageNotifications: true,
      groupNotifications: true,
      systemNotifications: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      frequency: 'instant' // 'instant', 'batched', 'daily'
    },
    isLoadingPreferences: false,
    preferencesError: null,
    
    // Permission state
    permissionState: 'default', // 'default', 'granted', 'denied'
    
    // Actions
    
    // Load notifications
    loadNotifications: async (reset = false) => {
      try {
        set((draft) => {
          if (reset) {
            draft.isLoading = true
            draft.error = null
          } else {
            draft.isLoadingMore = true
          }
        })
        
        const state = get()
        const cursor = reset ? null : state.nextCursor
        
        const response = await notificationService.getNotifications({
          cursor,
          limit: 20,
          filter: state.filter,
          type: state.typeFilter !== 'all' ? state.typeFilter : undefined
        })
        
        // Handle both array response and paginated response
        const notifications = Array.isArray(response) ? response : (response.data?.notifications || [])
        
        set((draft) => {
          if (reset) {
            draft.notifications.clear()
          }
          
          notifications.forEach(notification => {
            draft.notifications.set(notification.id, notification)
          })
          
          // Handle pagination data if available
          if (response && typeof response === 'object' && !Array.isArray(response)) {
            draft.hasMore = response.data?.hasMore || false
            draft.nextCursor = response.data?.nextCursor || null
            draft.unreadCount = response.data?.unreadCount || draft.unreadCount
          }
          
          draft.isLoading = false
          draft.isLoadingMore = false
        })
        
        console.log(`🔔 Loaded ${notifications.length} notifications`)
        
      } catch (error) {
        console.error('❌ Failed to load notifications:', error)
        set((draft) => {
          draft.isLoading = false
          draft.isLoadingMore = false
          draft.error = error.message
        })
        toast.error('Failed to load notifications')
      }
    },
    
    // Mark notifications as read
    markAsRead: async (notificationIds) => {
      try {
        set((draft) => {
          draft.isMarkingAsRead = true
        })
        
        await notificationService.markAsRead(notificationIds)
        
        set((draft) => {
          notificationIds.forEach(id => {
            const notification = draft.notifications.get(id)
            if (notification && !notification.readAt) {
              notification.readAt = new Date().toISOString()
              draft.unreadCount = Math.max(0, draft.unreadCount - 1)
            }
          })
          draft.isMarkingAsRead = false
        })
        
        console.log(`✅ Marked ${notificationIds.length} notifications as read`)
        
      } catch (error) {
        console.error('❌ Failed to mark notifications as read:', error)
        set((draft) => {
          draft.isMarkingAsRead = false
        })
        toast.error('Failed to mark notifications as read')
      }
    },
    
    // Mark all notifications as read
    markAllAsRead: async () => {
      try {
        set((draft) => {
          draft.isMarkingAsRead = true
        })
        
        await notificationService.markAllAsRead()
        
        set((draft) => {
          draft.notifications.forEach(notification => {
            if (!notification.readAt) {
              notification.readAt = new Date().toISOString()
            }
          })
          draft.unreadCount = 0
          draft.isMarkingAsRead = false
        })
        
        console.log('✅ Marked all notifications as read')
        toast.success('All notifications marked as read')
        
      } catch (error) {
        console.error('❌ Failed to mark all notifications as read:', error)
        set((draft) => {
          draft.isMarkingAsRead = false
        })
        toast.error('Failed to mark all notifications as read')
      }
    },
    
    // Delete notifications
    deleteNotifications: async (notificationIds) => {
      try {
        await notificationService.deleteNotifications(notificationIds)
        
        set((draft) => {
          notificationIds.forEach(id => {
            const notification = draft.notifications.get(id)
            if (notification && !notification.readAt) {
              draft.unreadCount = Math.max(0, draft.unreadCount - 1)
            }
            draft.notifications.delete(id)
          })
        })
        
        console.log(`🗑️ Deleted ${notificationIds.length} notifications`)
        toast.success(`Deleted ${notificationIds.length} notifications`)
        
      } catch (error) {
        console.error('❌ Failed to delete notifications:', error)
        toast.error('Failed to delete notifications')
      }
    },
    
    // Clear all notifications
    clearAll: async () => {
      try {
        await notificationService.clearAll()
        
        set((draft) => {
          draft.notifications.clear()
          draft.unreadCount = 0
          draft.hasMore = false
          draft.nextCursor = null
        })
        
        console.log('🗑️ Cleared all notifications')
        toast.success('All notifications cleared')
        
      } catch (error) {
        console.error('❌ Failed to clear notifications:', error)
        toast.error('Failed to clear notifications')
      }
    },
    
    // Real-time event handler
    handleNewNotification: (notification) => {
      set((draft) => {
        draft.notifications.set(notification.id, notification)
        
        if (!notification.readAt) {
          draft.unreadCount += 1
        }
      })
      
      // Show notification based on preferences
      get().showNotification(notification)
      
      console.log('🔔 New notification received:', notification.type)
    },
    
    // Show notification (toast, desktop, sound)
    showNotification: (notification) => {
      const state = get()
      const { preferences } = state
      
      if (!preferences.enabled) {
        return
      }
      
      // Check quiet hours
      if (preferences.quietHours.enabled && get().isInQuietHours()) {
        return
      }
      
      // Check type-specific preferences
      if (notification.type === 'message' && !preferences.messageNotifications) {
        return
      }
      if (notification.type === 'group' && !preferences.groupNotifications) {
        return
      }
      if (notification.type === 'system' && !preferences.systemNotifications) {
        return
      }
      
      // Show toast notification
      const toastOptions = {
        duration: 4000,
        position: 'top-right',
        style: {
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)'
        }
      }
      
      switch (notification.type) {
        case 'message':
          toast(notification.title, {
            ...toastOptions,
            icon: '💬'
          })
          break
        case 'group':
          toast(notification.title, {
            ...toastOptions,
            icon: '👥'
          })
          break
        case 'system':
          toast(notification.title, {
            ...toastOptions,
            icon: '⚙️'
          })
          break
        default:
          toast(notification.title, toastOptions)
      }
      
      // Show desktop notification
      if (preferences.desktop && state.permissionState === 'granted') {
        get().showDesktopNotification(notification)
      }
      
      // Play sound
      if (preferences.sound) {
        get().playNotificationSound()
      }
    },
    
    // Desktop notifications
    requestPermission: async () => {
      if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications')
        return 'denied'
      }
      
      try {
        const permission = await Notification.requestPermission()
        
        set((draft) => {
          draft.permissionState = permission
        })
        
        if (permission === 'granted') {
          toast.success('Desktop notifications enabled')
        } else if (permission === 'denied') {
          toast.error('Desktop notifications denied')
        }
        
        return permission
        
      } catch (error) {
        console.error('❌ Failed to request notification permission:', error)
        return 'denied'
      }
    },
    
    showDesktopNotification: (notification) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return
      }
      
      try {
        const desktopNotification = new Notification(notification.title, {
          body: notification.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          requireInteraction: false,
          silent: false
        })
        
        // Auto-close after 5 seconds
        setTimeout(() => {
          desktopNotification.close()
        }, 5000)
        
        // Handle click
        desktopNotification.onclick = async () => {
          window.focus()
          
          // Navigate to relevant conversation if it's a message notification
          if (notification.type === 'message' && notification.data?.conversationId) {
            const chatStore = await import('./chatStore')
            chatStore.useChatStore.getState().setActiveConversation(notification.data.conversationId)
          }
          
          desktopNotification.close()
        }
        
      } catch (error) {
        console.error('❌ Failed to show desktop notification:', error)
      }
    },
    
    // Sound notifications
    playNotificationSound: () => {
      try {
        // Create audio element for notification sound
        const audio = new Audio('/sounds/notification.mp3')
        audio.volume = 0.5
        audio.play().catch(error => {
          console.warn('Could not play notification sound:', error)
        })
      } catch (error) {
        console.warn('Could not play notification sound:', error)
      }
    },
    
    // Preferences
    loadPreferences: async () => {
      try {
        set((draft) => {
          draft.isLoadingPreferences = true
          draft.preferencesError = null
        })
        
        const preferences = await notificationService.getPreferences()
        
        set((draft) => {
          draft.preferences = { ...draft.preferences, ...preferences }
          draft.isLoadingPreferences = false
        })
        
        console.log('⚙️ Loaded notification preferences')
        
      } catch (error) {
        console.error('❌ Failed to load notification preferences:', error)
        set((draft) => {
          draft.isLoadingPreferences = false
          draft.preferencesError = error.message
        })
      }
    },
    
    updatePreferences: async (updates) => {
      try {
        const updatedPreferences = await notificationService.updatePreferences(updates)
        
        set((draft) => {
          draft.preferences = { ...draft.preferences, ...updatedPreferences }
        })
        
        console.log('⚙️ Updated notification preferences')
        toast.success('Notification preferences updated')
        
      } catch (error) {
        console.error('❌ Failed to update notification preferences:', error)
        toast.error('Failed to update preferences')
        throw error
      }
    },
    
    // Filters
    setFilter: (filter) => {
      set((draft) => {
        draft.filter = filter
      })
      
      // Reload notifications with new filter
      get().loadNotifications(true)
    },
    
    setTypeFilter: (typeFilter) => {
      set((draft) => {
        draft.typeFilter = typeFilter
      })
      
      // Reload notifications with new filter
      get().loadNotifications(true)
    },
    
    // Utility functions
    isInQuietHours: () => {
      const { preferences } = get()
      
      if (!preferences.quietHours.enabled) {
        return false
      }
      
      const now = new Date()
      const currentTime = now.getHours() * 60 + now.getMinutes()
      
      const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number)
      const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number)
      
      const startTime = startHour * 60 + startMin
      const endTime = endHour * 60 + endMin
      
      if (startTime <= endTime) {
        // Same day (e.g., 09:00 to 17:00)
        return currentTime >= startTime && currentTime <= endTime
      } else {
        // Crosses midnight (e.g., 22:00 to 08:00)
        return currentTime >= startTime || currentTime <= endTime
      }
    },
    
    // Getters
    getNotifications: () => {
      const state = get()
      const notifications = Array.from(state.notifications.values())
      
      // Apply filters
      let filtered = notifications
      
      if (state.filter === 'unread') {
        filtered = filtered.filter(n => !n.readAt)
      } else if (state.filter === 'read') {
        filtered = filtered.filter(n => n.readAt)
      }
      
      if (state.typeFilter !== 'all') {
        filtered = filtered.filter(n => n.type === state.typeFilter)
      }
      
      // Sort by creation date (newest first)
      return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },
    
    getNotification: (notificationId) => {
      return get().notifications.get(notificationId)
    },
    
    getUnreadNotifications: () => {
      const notifications = Array.from(get().notifications.values())
      return notifications.filter(n => !n.readAt)
    },
    
    getNotificationsByType: (type) => {
      const notifications = Array.from(get().notifications.values())
      return notifications.filter(n => n.type === type)
    },
    
    // Initialize
    initialize: async () => {
      // Check notification permission
      if ('Notification' in window) {
        set((draft) => {
          draft.permissionState = Notification.permission
        })
      }
      
      // Load preferences and notifications
      await Promise.all([
        get().loadPreferences(),
        get().loadNotifications(true)
      ])
    },
    
    // Cleanup
    cleanup: () => {
      set((draft) => {
        draft.notifications.clear()
        draft.unreadCount = 0
        draft.hasMore = true
        draft.nextCursor = null
        draft.error = null
        draft.isLoading = false
        draft.isLoadingMore = false
        draft.isMarkingAsRead = false
      })
    }
  }))
)

// Initialize notification permission state on load
if (typeof window !== 'undefined' && 'Notification' in window) {
  useNotificationStore.getState().permissionState = Notification.permission
}

export { useNotificationStore }