import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import { useSocketService } from './services/socketService'
import { MainLayout, AuthLayout } from './components/layout'
import { 
  LoginForm, 
  RegisterForm, 
  ForgotPasswordForm, 
  ResetPasswordForm, 
  EmailVerificationForm 
} from './components/auth'
import { ChatInterface } from './components/chat'
import { ToastNotification } from './components/notifications'
import CallInterface from './components/call/CallInterface'
import IncomingCallModal from './components/call/IncomingCallModal'
import CallNotification from './components/call/CallNotification'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }
  
  return isAuthenticated ? children : <Navigate to="/auth/login" replace />
}

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

// Dashboard Component
const Dashboard = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to ChatApp
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Select a conversation from the sidebar to start chatting, or create a new one.
        </p>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              🚀 Getting Started
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
              <li>• Click the + button to start a new conversation</li>
              <li>• Use the search to find existing conversations</li>
              <li>• Click the bell icon to view notifications</li>
              <li>• Access settings from your profile menu</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Profile Page Component
const ProfilePage = () => {
  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Profile Settings
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Profile settings will be implemented here.
          </p>
        </div>
      </div>
    </div>
  )
}

// Settings Page Component
const SettingsPage = () => {
  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Settings
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Application settings will be implemented here.
          </p>
        </div>
      </div>
    </div>
  )
}

function App() {
  const { initialize, user,token } = useAuthStore()
  const { initializeTheme } = useThemeStore()
  const socketService = useSocketService()
  
  useEffect(() => {
    // Initialize theme
    initializeTheme()
    
    // Initialize authentication
    initialize()
  }, [])
  
  useEffect(() => {
    // Initialize socket connection when user is authenticated
    if (token) {
      socketService.connect(token)
      
      return () => {
        socketService.disconnect()
      }
    }
  }, [token])
  
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/auth" element={
            <PublicRoute>
              <AuthLayout />
            </PublicRoute>
          }>
            <Route path="login" element={<LoginForm />} />
            <Route path="register" element={<RegisterForm />} />
            <Route path="forgot-password" element={<ForgotPasswordForm />} />
            <Route path="reset-password" element={<ResetPasswordForm />} />
            <Route path="verify-email" element={<EmailVerificationForm />} />
          </Route>
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="chat" element={<Dashboard />} />
            <Route path="chat/:conversationId" element={<ChatInterface />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Global Toast Notifications */}
        <ToastNotification />
        
        {/* Call Components */}
        <CallInterface />
        <IncomingCallModal />
        <CallNotification />
      </div>
    </Router>
  )
}

export default App