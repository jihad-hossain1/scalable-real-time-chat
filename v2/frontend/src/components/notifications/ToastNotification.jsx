import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'

const ToastNotification = () => {
  const [toasts, setToasts] = useState([])
  const { toastNotifications, removeToast } = useNotificationStore()
  
  useEffect(() => {
    setToasts(toastNotifications)
  }, [toastNotifications])
  
  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />
      case 'info':
      default:
        return <Info className="w-5 h-5" />
    }
  }
  
  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400',
          title: 'text-green-800 dark:text-green-200',
          message: 'text-green-700 dark:text-green-300',
          closeButton: 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300'
        }
      case 'error':
        return {
          container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-800 dark:text-red-200',
          message: 'text-red-700 dark:text-red-300',
          closeButton: 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300'
        }
      case 'warning':
        return {
          container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-800 dark:text-yellow-200',
          message: 'text-yellow-700 dark:text-yellow-300',
          closeButton: 'text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300'
        }
      case 'info':
      default:
        return {
          container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-blue-800 dark:text-blue-200',
          message: 'text-blue-700 dark:text-blue-300',
          closeButton: 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300'
        }
    }
  }
  
  const handleClose = (toastId) => {
    removeToast(toastId)
  }
  
  const handleAction = (toast) => {
    if (toast.action && toast.action.handler) {
      toast.action.handler()
    }
    handleClose(toast.id)
  }
  
  if (toasts?.length === 0) {
    return null
  }
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts?.map((toast) => {
        const styles = getToastStyles(toast.type)
        
        return (
          <div
            key={toast.id}
            className={`
              relative p-4 rounded-lg border shadow-lg backdrop-blur-sm
              transform transition-all duration-300 ease-in-out
              animate-in slide-in-from-right-full
              ${styles.container}
            `}
          >
            <div className="flex items-start">
              {/* Icon */}
              <div className={`flex-shrink-0 ${styles.icon}`}>
                {getToastIcon(toast.type)}
              </div>
              
              {/* Content */}
              <div className="ml-3 flex-1">
                {toast.title && (
                  <h4 className={`text-sm font-medium ${styles.title}`}>
                    {toast.title}
                  </h4>
                )}
                
                <p className={`text-sm ${toast.title ? 'mt-1' : ''} ${styles.message}`}>
                  {toast.message}
                </p>
                
                {/* Action button */}
                {toast.action && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleAction(toast)}
                      className={`
                        text-sm font-medium underline hover:no-underline
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
                        ${styles.closeButton}
                      `}
                    >
                      {toast.action.label}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Close button */}
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => handleClose(toast.id)}
                  className={`
                    inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
                    ${styles.closeButton}
                  `}
                >
                  <span className="sr-only">Dismiss</span>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Progress bar for auto-dismiss */}
            {toast.duration && toast.duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-10 rounded-b-lg overflow-hidden">
                <div
                  className="h-full bg-current opacity-30 transition-all ease-linear"
                  style={{
                    width: '100%',
                    animation: `toast-progress ${toast.duration}ms linear forwards`
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
      
      {/* CSS for progress bar animation */}
      <style jsx>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-in {
          animation: animate-in 0.3s ease-out;
        }
        
        .slide-in-from-right-full {
          animation: animate-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default ToastNotification