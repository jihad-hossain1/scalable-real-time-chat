import React, { useState } from 'react'
import { useCallStore, CALL_TYPES } from '../../stores/callStore'
import { Phone, Video, PhoneOff } from 'lucide-react'
import { motion } from 'framer-motion'

const CallControls = ({ userId, className = '' }) => {
  const { initializeCall, isCallActive, endCall, currentCall } = useCallStore()
  const [isInitiating, setIsInitiating] = useState(false)
  
  const handleVoiceCall = async () => {
    if (isCallActive()) {
      endCall()
      return
    }
    
    setIsInitiating(true)
    try {
      await initializeCall(userId, CALL_TYPES.AUDIO)
    } catch (error) {
      console.error('Failed to initiate voice call:', error)
    } finally {
      setIsInitiating(false)
    }
  }
  
  const handleVideoCall = async () => {
    if (isCallActive()) {
      endCall()
      return
    }
    
    setIsInitiating(true)
    try {
      await initializeCall(userId, CALL_TYPES.VIDEO)
    } catch (error) {
      console.error('Failed to initiate video call:', error)
    } finally {
      setIsInitiating(false)
    }
  }
  
  const isCurrentCallWithUser = currentCall?.userId === userId
  const showEndCall = isCallActive() && isCurrentCallWithUser
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showEndCall ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleVoiceCall}
          className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
          title="End call"
        >
          <PhoneOff className="w-5 h-5 text-white" />
        </motion.button>
      ) : (
        <>
          {/* Voice Call Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleVoiceCall}
            disabled={isInitiating || (isCallActive() && !isCurrentCallWithUser)}
            className="p-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-full transition-colors"
            title="Voice call"
          >
            <Phone className="w-5 h-5 text-white" />
          </motion.button>
          
          {/* Video Call Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleVideoCall}
            disabled={isInitiating || (isCallActive() && !isCurrentCallWithUser)}
            className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-full transition-colors"
            title="Video call"
          >
            <Video className="w-5 h-5 text-white" />
          </motion.button>
        </>
      )}
      
      {isInitiating && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>Calling...</span>
        </div>
      )}
    </div>
  )
}

export default CallControls