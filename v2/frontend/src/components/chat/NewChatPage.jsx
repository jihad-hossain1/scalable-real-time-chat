import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { User, MessageSquare, ArrowLeft } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'
import { chatService } from '../../services/chatService'
import toast from 'react-hot-toast'

const NewChatPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [targetUser, setTargetUser] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  const { user: isUser } = useAuthStore()
  const userData = isUser?.data
  const { createConversation } = useChatStore()
  const userId = searchParams.get('userId')
  
  useEffect(() => {
    if (userId && userData) {
      fetchUserDetails(userId)
    }
  }, [userId, userData])
  
  const fetchUserDetails = async (targetUserId) => {
    if (targetUserId == userData.id) {
      toast.error('You cannot start a conversation with yourself')
      // navigate('/dashboard')
      return
    }
    
    setIsLoading(true)
    try {
      const response = await chatService.getUser(targetUserId)
      
      if (response) {
        setTargetUser(response)
      } else {
        toast.error('User not found')
        // navigate('/dashboard')
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error)
      toast.error('Failed to load user details')
      // navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleStartConversation = async () => {
    if (!targetUser) return
    
    setIsCreating(true)
    try {
      const conversation = await createConversation({
        userId: userData?.id,
        receiverId: userId
      })
      
      if (conversation) {
        toast.success(`Started conversation with ${targetUser.username}`)
        navigate(`/chat/${conversation.id}`)
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
      toast.error('Failed to start conversation')
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleGoBack = () => {
    navigate('/dashboard')
  }
  
  if (!userData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }
  
  if (!userId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Invalid Request
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No user specified for the new conversation.
          </p>
          <button
            onClick={handleGoBack}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading user details...
          </p>
        </div>
      </div>
    )
  }
  
  if (!targetUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            User Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The user you're trying to chat with could not be found.
          </p>
          <button
            onClick={handleGoBack}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <MessageSquare className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Start New Conversation
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You're about to start a conversation with:
          </p>
        </div>
        
        {/* User Card */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={targetUser.avatar || '/default-avatar.png'}
                alt={targetUser.username}
                className="w-16 h-16 rounded-full"
              />
              {targetUser.isOnline && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-700 rounded-full" />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {targetUser.username}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {targetUser.email}
              </p>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  targetUser.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {targetUser.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleGoBack}
            className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStartConversation}
            disabled={isCreating}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-2" />
                Start Chat
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewChatPage