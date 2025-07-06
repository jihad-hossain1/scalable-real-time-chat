import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App.jsx'
import './index.css'

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error)
    }
    
    // In production, you might want to log to an error reporting service
    // logErrorToService(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">
          We're sorry, but something unexpected happened. Please try refreshing the page.
        </p>
        <div className="space-y-2">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Refresh Page
          </button>
        </div>
        {import.meta.env.DEV && error && (
          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {showDetails ? 'Hide' : 'Show'} Error Details (Development)
            </button>
            {showDetails && (
              <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32 text-left">
                {error.toString()}
                {error.stack && `\n${error.stack}`}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Error boundary wrapper component
const AppErrorBoundary = ({ children }) => {
  const handleError = (error, errorInfo) => {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo)
    }
    
    // In production, you might want to log to an error reporting service
    // logErrorToService(error, errorInfo)
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Clear any cached state or perform cleanup
        window.location.reload()
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Toast configuration
const toastOptions = {
  duration: 4000,
  position: 'top-right',
  style: {
    background: '#ffffff',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  success: {
    iconTheme: {
      primary: '#10b981',
      secondary: '#ffffff',
    },
  },
  error: {
    iconTheme: {
      primary: '#ef4444',
      secondary: '#ffffff',
    },
  },
  loading: {
    iconTheme: {
      primary: '#3b82f6',
      secondary: '#ffffff',
    },
  },
}

// Performance monitoring (development only)
if (import.meta.env.DEV) {
  // Log render performance
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure') {
        console.log(`⚡ ${entry.name}: ${entry.duration.toFixed(2)}ms`)
      }
    }
  })
  observer.observe({ entryTypes: ['measure'] })
}

// Service worker registration
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
)

// Hot module replacement for development
if (import.meta.hot) {
  import.meta.hot.accept()
}

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  // In production, you might want to log to an error reporting service
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  // In production, you might want to log to an error reporting service
})

// Prevent zoom on double tap (mobile)
let lastTouchEnd = 0
document.addEventListener('touchend', (event) => {
  const now = (new Date()).getTime()
  if (now - lastTouchEnd <= 300) {
    event.preventDefault()
  }
  lastTouchEnd = now
}, false)

// Disable context menu on production
if (import.meta.env.PROD) {
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault()
  })
}

// Console welcome message
if (import.meta.env.PROD) {
  console.log(
    '%cChatApp 🚀',
    'color: #3b82f6; font-size: 24px; font-weight: bold;'
  )
  console.log(
    '%cWelcome to ChatApp! Built with React, Socket.IO, and lots of ❤️',
    'color: #6b7280; font-size: 14px;'
  )
} else {
  console.log(
    '%cChatApp Development Mode 🛠️',
    'color: #f59e0b; font-size: 18px; font-weight: bold;'
  )
}