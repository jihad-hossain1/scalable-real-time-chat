import { Outlet } from 'react-router-dom'
import { useThemeStore } from '../../stores/themeStore'
import { Moon, Sun } from 'lucide-react'

const AuthLayout = () => {
  const { theme, toggleTheme } = useThemeStore()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              ChatApp
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time messaging platform
            </p>
          </div>
        </div>
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="
            p-2 rounded-lg border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-white
            hover:bg-gray-50 dark:hover:bg-gray-700
            transition-colors duration-200
          "
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="p-6 text-center">
        <div className="space-y-4">
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Real-time Messaging
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Instant message delivery with WebSocket technology
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Secure & Private
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                End-to-end encryption for your conversations
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🌐</span>
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Cross-platform
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Access your chats from any device, anywhere
              </p>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © 2024 ChatApp. All rights reserved.
            </p>
            <div className="flex items-center justify-center space-x-4 mt-2">
              <a
                href="#"
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default AuthLayout