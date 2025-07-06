import React, { useEffect, useState } from 'react'
import { useCallStore, CALL_STATES, CALL_TYPES } from '../../stores/callStore'
import { Phone, PhoneOff, Video, Mic } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const IncomingCallModal = () => {
  const {
    currentCall,
    callState,
    acceptCall,
    rejectCall,
    isCallActive
  } = useCallStore()
  
  const [ringTone, setRingTone] = useState(null)
  
  // Play ringtone when call is incoming
  useEffect(() => {
    if (callState === CALL_STATES.RINGING && !currentCall?.isInitiator) {
      // Create audio element for ringtone
      const audio = new Audio()
      audio.loop = true
      audio.volume = 0.5
      
      // Use a simple beep tone (you can replace with actual ringtone file)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      
      const playRingtone = () => {
        oscillator.start()
        setTimeout(() => {
          try {
            oscillator.stop()
          } catch (e) {
            // Oscillator already stopped
          }
        }, 1000)
      }
      
      const interval = setInterval(playRingtone, 2000)
      playRingtone()
      
      setRingTone({ interval, audioContext })
      
      return () => {
        clearInterval(interval)
        try {
          audioContext.close()
        } catch (e) {
          // Context already closed
        }
      }
    }
  }, [callState, currentCall?.isInitiator])
  
  // Clean up ringtone when call ends or is accepted
  useEffect(() => {
    if (callState !== CALL_STATES.RINGING && ringTone) {
      clearInterval(ringTone.interval)
      try {
        ringTone.audioContext.close()
      } catch (e) {
        // Context already closed
      }
      setRingTone(null)
    }
  }, [callState, ringTone])
  
  const handleAccept = async () => {
    try {
      await acceptCall()
    } catch (error) {
      console.error('Failed to accept call:', error)
    }
  }
  
  const handleReject = () => {
    rejectCall()
  }
  
  // Only show for incoming calls
  if (!isCallActive() || currentCall?.isInitiator || callState !== CALL_STATES.RINGING) {
    return null
  }
  
  const isVideoCall = currentCall?.type === CALL_TYPES.VIDEO
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
        >
          {/* Caller Avatar */}
          <div className="relative mb-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-white text-2xl font-bold">
                {currentCall?.userId?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </motion.div>
            
            {/* Call type indicator */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="bg-gray-800 rounded-full p-2">
                {isVideoCall ? (
                  <Video className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </div>
          
          {/* Caller Info */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {currentCall?.userId || 'Unknown User'}
            </h3>
            <p className="text-gray-600">
              Incoming {isVideoCall ? 'video' : 'voice'} call
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-8">
            {/* Reject Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleReject}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </motion.button>
            
            {/* Accept Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleAccept}
              className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
            >
              <Phone className="w-8 h-8 text-white" />
            </motion.button>
          </div>
          
          {/* Ripple Animation */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              animate={{ scale: [1, 2], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-blue-400 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 2], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-blue-400 rounded-full"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default IncomingCallModal