import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { toast } from 'react-hot-toast'
import { socketService } from '../services/socketService'

// Call states
export const CALL_STATES = {
  IDLE: 'idle',
  CALLING: 'calling',
  RINGING: 'ringing',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
  FAILED: 'failed'
}

// Call types
export const CALL_TYPES = {
  AUDIO: 'audio',
  VIDEO: 'video'
}

export const useCallStore = create(
  immer((set, get) => ({
    // State
    currentCall: null,
    callState: CALL_STATES.IDLE,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isMuted: false,
    isVideoOff: false,
    callHistory: [],
    incomingCall: null,
    callDuration: 0,
    callTimer: null,
    isScreenSharing: false,
    screenShareStream: null,
    
    // WebRTC configuration
    rtcConfiguration: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    },
    
    // Actions
    initializeCall: async (userId, type = CALL_TYPES.AUDIO) => {
      try {
        set((draft) => {
          draft.callState = CALL_STATES.CALLING
          draft.currentCall = {
            id: Date.now().toString(),
            userId,
            type,
            isInitiator: true,
            startTime: new Date().toISOString()
          }
        })
        
        // Get user media
        const stream = await get().getUserMedia(type)
        if (!stream) {
          throw new Error('Failed to get user media')
        }
        
        // Create peer connection
        const pc = get().createPeerConnection()
        
        // Add local stream to peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream)
        })
        
        // Create offer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        
        // Send call initiation through socket
        socketService.emit('call:initiate', {
          userId,
          type,
          offer: offer,
          callId: get().currentCall.id
        })
        
        console.log('📞 Call initiated to user:', userId)
        
      } catch (error) {
        console.error('❌ Failed to initiate call:', error)
        get().endCall()
        toast.error('Failed to start call')
      }
    },
    
    acceptCall: async (callData) => {
      try {
        set((draft) => {
          draft.callState = CALL_STATES.CONNECTING
          draft.currentCall = {
            ...callData,
            isInitiator: false,
            startTime: new Date().toISOString()
          }
          draft.incomingCall = null
        })
        
        // Get user media
        const stream = await get().getUserMedia(callData.type)
        if (!stream) {
          throw new Error('Failed to get user media')
        }
        
        // Create peer connection
        const pc = get().createPeerConnection()
        
        // Add local stream
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream)
        })
        
        // Set remote description
        await pc.setRemoteDescription(callData.offer)
        
        // Create answer
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        
        // Send answer through socket
        socketService.emit('call:accept', {
          callId: callData.id,
          answer: answer
        })
        
        console.log('📞 Call accepted')
        
      } catch (error) {
        console.error('❌ Failed to accept call:', error)
        get().rejectCall()
        toast.error('Failed to accept call')
      }
    },
    
    rejectCall: (callId) => {
      const { incomingCall } = get()
      
      if (incomingCall) {
        socketService.emit('call:reject', {
          callId: callId || incomingCall.id
        })
      }
      
      set((draft) => {
        draft.incomingCall = null
        draft.callState = CALL_STATES.IDLE
      })
      
      console.log('📞 Call rejected')
    },
    
    endCall: () => {
      const { currentCall, peerConnection, localStream, remoteStream, callTimer, screenShareStream } = get()
      
      // Stop call timer
      if (callTimer) {
        clearInterval(callTimer)
      }
      
      // Close peer connection
      if (peerConnection) {
        peerConnection.close()
      }
      
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
      
      // Stop screen share stream
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop())
      }
      
      // Notify other party
      if (currentCall) {
        socketService.emit('call:end', {
          callId: currentCall.id
        })
        
        // Add to call history
        const callRecord = {
          ...currentCall,
          endTime: new Date().toISOString(),
          duration: get().callDuration
        }
        
        set((draft) => {
          draft.callHistory.unshift(callRecord)
        })
      }
      
      // Reset state
      set((draft) => {
        draft.currentCall = null
        draft.callState = CALL_STATES.IDLE
        draft.localStream = null
        draft.remoteStream = null
        draft.peerConnection = null
        draft.callDuration = 0
        draft.callTimer = null
        draft.isScreenSharing = false
        draft.screenShareStream = null
        draft.incomingCall = null
      })
      
      console.log('📞 Call ended')
    },
    
    toggleAudio: () => {
      const { localStream } = get()
      
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled
          
          set((draft) => {
            draft.isMuted = !audioTrack.enabled
          })
          
          console.log('🎤 Audio toggled:', audioTrack.enabled ? 'on' : 'off')
        }
      }
    },
    
    toggleVideo: () => {
      const { localStream } = get()
      
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled
          
          set((draft) => {
            draft.isVideoOff = !videoTrack.enabled
          })
          
          console.log('📹 Video toggled:', videoTrack.enabled ? 'on' : 'off')
        }
      }
    },
    
    startScreenShare: async () => {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        
        const { peerConnection, localStream } = get()
        
        if (peerConnection && localStream) {
          // Replace video track with screen share
          const videoTrack = screenStream.getVideoTracks()[0]
          const sender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          )
          
          if (sender) {
            await sender.replaceTrack(videoTrack)
          }
          
          // Handle screen share end
          videoTrack.onended = () => {
            get().stopScreenShare()
          }
          
          set((draft) => {
            draft.isScreenSharing = true
            draft.screenShareStream = screenStream
          })
          
          console.log('🖥️ Screen sharing started')
        }
        
      } catch (error) {
        console.error('❌ Failed to start screen sharing:', error)
        toast.error('Failed to start screen sharing')
      }
    },
    
    stopScreenShare: async () => {
      const { peerConnection, localStream, screenShareStream } = get()
      
      if (peerConnection && localStream && screenShareStream) {
        // Stop screen share stream
        screenShareStream.getTracks().forEach(track => track.stop())
        
        // Replace with camera video
        const videoTrack = localStream.getVideoTracks()[0]
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
        }
        
        set((draft) => {
          draft.isScreenSharing = false
          draft.screenShareStream = null
        })
        
        console.log('🖥️ Screen sharing stopped')
      }
    },
    
    // Helper functions
    getUserMedia: async (type) => {
      try {
        const constraints = {
          audio: true,
          video: type === CALL_TYPES.VIDEO
        }
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        
        set((draft) => {
          draft.localStream = stream
        })
        
        return stream
        
      } catch (error) {
        console.error('❌ Failed to get user media:', error)
        toast.error('Failed to access camera/microphone')
        return null
      }
    },
    
    createPeerConnection: () => {
      const pc = new RTCPeerConnection(get().rtcConfiguration)
      
      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('📡 Received remote stream')
        set((draft) => {
          draft.remoteStream = event.streams[0]
        })
      }
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('call:ice-candidate', {
            callId: get().currentCall?.id,
            candidate: event.candidate
          })
        }
      }
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState)
        
        if (pc.connectionState === 'connected') {
          set((draft) => {
            draft.callState = CALL_STATES.CONNECTED
          })
          
          // Start call timer
          const timer = setInterval(() => {
            set((draft) => {
              draft.callDuration += 1
            })
          }, 1000)
          
          set((draft) => {
            draft.callTimer = timer
          })
          
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          get().endCall()
        }
      }
      
      set((draft) => {
        draft.peerConnection = pc
      })
      
      return pc
    },
    
    // Socket event handlers
    handleIncomingCall: (callData) => {
      set((draft) => {
        draft.incomingCall = callData
        draft.callState = CALL_STATES.RINGING
      })
      
      console.log('📞 Incoming call from:', callData.userId)
      toast.success(`Incoming ${callData.type} call`)
    },
    
    handleCallAccepted: async (data) => {
      const { peerConnection } = get()
      
      if (peerConnection) {
        await peerConnection.setRemoteDescription(data.answer)
        
        set((draft) => {
          draft.callState = CALL_STATES.CONNECTING
        })
        
        console.log('📞 Call accepted by remote user')
      }
    },
    
    handleCallRejected: () => {
      get().endCall()
      toast.error('Call was rejected')
    },
    
    handleCallEnded: () => {
      get().endCall()
      toast.info('Call ended')
    },
    
    handleIceCandidate: async (data) => {
      const { peerConnection } = get()
      
      if (peerConnection && data.candidate) {
        try {
          await peerConnection.addIceCandidate(data.candidate)
        } catch (error) {
          console.error('❌ Failed to add ICE candidate:', error)
        }
      }
    },
    
    // Utility functions
    formatCallDuration: (seconds) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    },
    
    isCallActive: () => {
      const { callState } = get()
      return [CALL_STATES.CALLING, CALL_STATES.RINGING, CALL_STATES.CONNECTING, CALL_STATES.CONNECTED].includes(callState)
    },
    
    // Initialize socket listeners
    initializeSocketListeners: () => {
      socketService.on('call:incoming', get().handleIncomingCall)
      socketService.on('call:accepted', get().handleCallAccepted)
      socketService.on('call:rejected', get().handleCallRejected)
      socketService.on('call:ended', get().handleCallEnded)
      socketService.on('call:ice-candidate', get().handleIceCandidate)
    },
    
    // Cleanup
    cleanup: () => {
      get().endCall()
      
      // Remove socket listeners
      socketService.off('call:incoming', get().handleIncomingCall)
      socketService.off('call:accepted', get().handleCallAccepted)
      socketService.off('call:rejected', get().handleCallRejected)
      socketService.off('call:ended', get().handleCallEnded)
      socketService.off('call:ice-candidate', get().handleIceCandidate)
    }
  }))
)