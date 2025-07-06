import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Bell, Settings, LogOut, Moon, Sun, Search, Plus } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useThemeStore } from '../../stores/themeStore'
import { NotificationCenter, ToastNotification } from '../notifications'
import { ConversationList } from '../chat'

const MainLayout = () => {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  
  const { user, logout, isLoading } = useAuthStore()
  const { unreadCount, initialize: initializeNotifications } = useNotificationStore()
  const { theme, toggleTheme } = useThemeStore()
  
  useEffect(() => {
    if (user) {
      initializeNotifications()
    }
  }, [user])
  
  useEffect(() => {
    // Extract conversation ID from URL if present
    const pathParts = location.pathname.split('/')
    if (pathParts[1] === 'chat' && pathParts[2]) {
      setSelectedConversationId(pathParts[2])
    } else {
      setSelectedConversationId(null)
    }
  }, [location.pathname])
  
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
  
  const handleSelectConversation = (conversationId) => {
    setSelectedConversationId(conversationId)
    navigate(`/chat/${conversationId}`)
  }
  
  const handleNewChat = () => {
    // TODO: Implement new chat functionality
    console.log('New chat')
  }
  
  const handleSearch = () => {
    // TODO: Implement global search
    console.log('Global search')
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 flex flex-col items-center py-4 space-y-4">
          <button
            onClick={handleNewChat}
            className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSearch}
            className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Bottom actions */}
        <div className="flex flex-col items-center pb-4 space-y-4">
          <button
            onClick={toggleTheme}
            className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button
            className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {/* User Avatar */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 transition-colors"
            >
              <img
                src={user?.avatar || '/default-avatar.png'}
                alt={user?.username}
                className="w-full h-full object-cover"
              />
            </button>
            
            {/* User Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    navigate('/profile')
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Profile
                </button>
                
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    navigate('/settings')
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Settings
                </button>
                
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    handleLogout()
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Conversation List - Show on chat routes */}
        {location.pathname.startsWith('/chat') && (
          <ConversationList
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
          />
        )}
        
        {/* Main Content */}
        <div className="flex-1">
          <Outlet context={{ selectedConversationId }} />
        </div>
      </div>
      
      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      
      {/* Toast Notifications */}
      <ToastNotification />
      
      {/* Click outside to close menus */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowUserMenu(false)
            setShowNotifications(false)
          }}
        />
      )}
    </div>
  )
}

export default MainLayout