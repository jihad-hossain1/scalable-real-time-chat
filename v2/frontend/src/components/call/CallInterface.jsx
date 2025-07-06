import React, { useEffect, useRef } from 'react'
import { useCallStore, CALL_STATES, CALL_TYPES } from '../../stores/callStore'
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CallInterface = () => {
  const {
    currentCall,
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    callDuration,
    endCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    formatCallDuration,
    isCallActive
  } = useCallStore()
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [isMinimized, setIsMinimized] = React.useState(false)
  
  // Set up video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])
  
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])
  
  if (!isCallActive()) {
    return null
  }
  
  const isVideoCall = currentCall?.type === CALL_TYPES.VIDEO
  const isConnected = callState === CALL_STATES.CONNECTED
  
  const handleEndCall = () => {
    endCall()
  }
  
  const handleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare()
    } else {
      startScreenShare()
    }
  }
  
  const getCallStateText = () => {
    switch (callState) {
      case CALL_STATES.CALLING:
        return 'Calling...'
      case CALL_STATES.RINGING:
        return 'Ringing...'
      case CALL_STATES.CONNECTING:
        return 'Connecting...'
      case CALL_STATES.CONNECTED:
        return formatCallDuration(callDuration)
      default:
        return ''
    }
  }
  
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="bg-gray-900 rounded-lg p-3 shadow-2xl border border-gray-700">
          <div className="flex items-center space-x-3">
            {isVideoCall && remoteStream && (
              <div className="w-16 h-12 bg-gray-800 rounded overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="text-white">
              <div className="text-sm font-medium">
                {currentCall?.isInitiator ? 'Outgoing' : 'Incoming'} {currentCall?.type}
              </div>
              <div className="text-xs text-gray-400">
                {getCallStateText()}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
              
              <button
                onClick={handleEndCall}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
              >
                <PhoneOff className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gray-900 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">
              {currentCall?.userId?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          
          <div>
            <div className="text-white font-medium">
              {currentCall?.userId || 'Unknown User'}
            </div>
            <div className="text-gray-400 text-sm">
              {getCallStateText()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          >
            <Minimize2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      
      {/* Video Area */}
      {isVideoCall && (
        <div className="flex-1 relative bg-black">
          {/* Remote Video */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-medium">
                    {currentCall?.userId?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="text-lg">
                  {callState === CALL_STATES.CONNECTING ? 'Connecting...' : 'Waiting for video...'}
                </div>
              </div>
            </div>
          )}
          
          {/* Local Video (Picture-in-Picture) */}
          {localStream && (
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Audio Call UI */}
      {!isVideoCall && (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl font-medium">
                {currentCall?.userId?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            
            <div className="text-2xl font-medium mb-2">
              {currentCall?.userId || 'Unknown User'}
            </div>
            
            <div className="text-lg text-blue-200">
              {getCallStateText()}
            </div>
            
            {/* Audio visualization */}
            {isConnected && (
              <div className="flex justify-center space-x-1 mt-6">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-blue-400 rounded-full"
                    animate={{
                      height: [4, 20, 4],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="p-6 bg-gray-800">
        <div className="flex justify-center space-x-4">
          {/* Mute/Unmute */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-colors ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
          
          {/* Video Toggle (only for video calls) */}
          {isVideoCall && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoOff 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-white" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          {/* Screen Share (only for video calls) */}
          {isVideoCall && isConnected && (
            <button
              onClick={handleScreenShare}
              className={`p-4 rounded-full transition-colors ${
                isScreenSharing 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isScreenSharing ? (
                <MonitorOff className="w-6 h-6 text-white" />
              ) : (
                <Monitor className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default CallInterface