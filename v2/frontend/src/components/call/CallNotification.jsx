import React, { useEffect, useState } from 'react'
import { useCallStore, CALL_STATES } from '../../stores/callStore'
import { Phone, PhoneOff, Clock, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CallNotification = () => {
  const {
    currentCall,
    callState,
    callError,
    isCallActive,
    endCall,
    formatCallDuration,
    callDuration
  } = useCallStore()
  
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState('info') // 'info', 'success', 'error'
  
  useEffect(() => {
    if (!isCallActive()) {
      setShowNotification(false)
      return
    }
    
    let message = ''
    let type = 'info'
    
    switch (callState) {
      case CALL_STATES.CALLING:
        message = `Calling ${currentCall?.userId}...`
        type = 'info'
        break
      case CALL_STATES.RINGING:
        if (currentCall?.isInitiator) {
          message = `Ringing ${currentCall?.userId}...`
          type = 'info'
        }
        break
      case CALL_STATES.CONNECTING:
        message = 'Connecting...'
        type = 'info'
        break
      case CALL_STATES.CONNECTED:
        message = `Connected - ${formatCallDuration(callDuration)}`
        type = 'success'
        break
      case CALL_STATES.ENDED:
        message = 'Call ended'
        type = 'info'
        break
      case CALL_STATES.FAILED:
        message = callError || 'Call failed'
        type = 'error'
        break
      case CALL_STATES.REJECTED:
        message = 'Call rejected'
        type = 'error'
        break
      default:
        setShowNotification(false)
        return
    }
    
    setNotificationMessage(message)
    setNotificationType(type)
    setShowNotification(true)
    
    // Auto-hide certain notifications
    if (callState === CALL_STATES.ENDED || callState === CALL_STATES.FAILED || callState === CALL_STATES.REJECTED) {
      const timer = setTimeout(() => {
        setShowNotification(false)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [callState, currentCall, callError, callDuration, formatCallDuration, isCallActive])
  
  const getNotificationColor = () => {
    switch (notificationType) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }
  
  const getNotificationIcon = () => {
    switch (notificationType) {
      case 'success':
        return <Phone className="w-4 h-4 text-white" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-white" />
      default:
        return <Clock className="w-4 h-4 text-white" />
    }
  }
  
  const handleEndCall = () => {
    endCall()
  }
  
  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40"
        >
          <div className={`${getNotificationColor()} rounded-lg shadow-lg p-4 min-w-64 max-w-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getNotificationIcon()}
                </div>
                
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {notificationMessage}
                  </p>
                  
                  {currentCall?.type && (
                    <p className="text-white text-xs opacity-90">
                      {currentCall.type.charAt(0).toUpperCase() + currentCall.type.slice(1)} call
                    </p>
                  )}
                </div>
              </div>
              
              {/* Show end call button for active calls */}
              {(callState === CALL_STATES.CALLING || 
                callState === CALL_STATES.RINGING || 
                callState === CALL_STATES.CONNECTING || 
                callState === CALL_STATES.CONNECTED) && (
                <button
                  onClick={handleEndCall}
                  className="ml-3 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title="End call"
                >
                  <PhoneOff className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
            
            {/* Progress bar for connecting state */}
            {callState === CALL_STATES.CONNECTING && (
              <div className="mt-2">
                <div className="w-full bg-white bg-opacity-30 rounded-full h-1">
                  <motion.div
                    className="bg-white h-1 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CallNotification