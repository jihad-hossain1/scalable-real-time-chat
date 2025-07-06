import { useState, useEffect } from 'react'
import { X, Search, User, Users, MessageSquare } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { chatService } from '../../services/chatService'
import { useAuthStore } from '../../stores/authStore'
import { formatRelativeTime } from '../../utils'
import toast from 'react-hot-toast'

const NewChatModal = ({ isOpen, onClose, onConversationCreated }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState('users') // 'users' or 'groups'
  
  const { user } = useAuthStore()
  const { createConversation } = useChatStore()
  
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSearchResults([])
      setSelectedUsers([])
      setActiveTab('users')
    }
  }, [isOpen])
  
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !user?.id) {
        setSearchResults([])
        return
      }
      
      setIsSearching(true)
      try {
        const results = await chatService.searchUsers(searchQuery)
        // Filter out current user
        const filteredResults = results.filter(u => u.id !== user.id)
        setSearchResults(filteredResults)
      } catch (error) {
        console.error('Search failed:', error)
        toast.error('Search failed')
      } finally {
        setIsSearching(false)
      }
    }
    
    const debounceTimer = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, user?.id])
  
  const handleUserSelect = (selectedUser) => {
    if (activeTab === 'users') {
      // For direct chat, immediately create conversation
      handleCreateConversation([selectedUser.id], false)
    } else {
      // For group chat, add to selection
      setSelectedUsers(prev => {
        const isSelected = prev.find(u => u.id === selectedUser.id)
        if (isSelected) {
          return prev.filter(u => u.id !== selectedUser.id)
        } else {
          return [...prev, selectedUser]
        }
      })
    }
  }
  
  const handleCreateConversation = async (participantIds, isGroup = false) => {
    setIsCreating(true)
    try {
      const conversation = await createConversation(participantIds, isGroup)
      onConversationCreated?.(conversation)
      onClose()
      toast.success(isGroup ? 'Group created successfully' : 'Chat started successfully')
    } catch (error) {
      console.error('Failed to create conversation:', error)
      toast.error('Failed to create conversation')
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleCreateGroup = () => {
    if (selectedUsers.length < 2) {
      toast.error('Please select at least 2 users for a group chat')
      return
    }
    
    const participantIds = selectedUsers.map(u => u.id)
    handleCreateConversation(participantIds, true)
  }
  
  if (!isOpen || !user) return null
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              New Chat
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Direct Chat
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Group Chat
            </button>
          </div>
          
          {/* Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Selected users for group chat */}
          {activeTab === 'groups' && selectedUsers.length > 0 && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                  >
                    <img
                      src={user.avatar || '/default-avatar.png'}
                      alt={user.username}
                      className="w-4 h-4 rounded-full"
                    />
                    <span>{user.username}</span>
                    <button
                      onClick={() => handleUserSelect(user)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                <MessageSquare className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchQuery ? 'No users found' : 'Search for users to start a chat'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchResults.map(searchUser => {
                  const isSelected = selectedUsers.find(u => u.id === searchUser.id)
                  
                  return (
                    <button
                      key={searchUser.id}
                      onClick={() => handleUserSelect(searchUser)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img
                            src={searchUser.avatar || '/default-avatar.png'}
                            alt={searchUser.username}
                            className="w-10 h-10 rounded-full"
                          />
                          {searchUser.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {searchUser.username}
                            </p>
                            {activeTab === 'groups' && isSelected && (
                              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {searchUser.email}
                          </p>
                          {!searchUser.isOnline && searchUser.lastSeen && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Last seen {formatRelativeTime(searchUser.lastSeen)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Footer for group chat */}
          {activeTab === 'groups' && selectedUsers.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCreateGroup}
                disabled={isCreating || selectedUsers.length < 2}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {isCreating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                Create Group ({selectedUsers.length} members)
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default NewChatModal