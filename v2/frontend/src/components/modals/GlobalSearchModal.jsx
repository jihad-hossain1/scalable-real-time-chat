import { useState, useEffect } from 'react'
import { X, Search, MessageSquare, Users, User, Clock, ArrowRight } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { chatService } from '../../services/chatService'
import { formatRelativeTime, truncateText } from '../../utils'
import { CONVERSATION_TYPES } from '../../constants'

const GlobalSearchModal = ({ isOpen, onClose, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all', 'messages', 'conversations', 'users'
  const [results, setResults] = useState({
    messages: [],
    conversations: [],
    users: []
  })
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  
  const { searchMessages } = useChatStore()
  
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setResults({ messages: [], conversations: [], users: [] })
      setActiveTab('all')
      loadRecentSearches()
    }
  }, [isOpen])
  
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery?.trim()) {
        setResults({ messages: [], conversations: [], users: [] })
        return
      }
      
      try {
        setIsSearching(true)
        // const [messagesResult, conversationsResult, usersResult] = await Promise.all([
        //   chatService.searchMessages(searchQuery).catch(() => []),
        //   chatService.searchConversations(searchQuery).catch(() => []),
        //   chatService.searchUsers(searchQuery).catch(() => [])
        // ])
        const userResult = await chatService.searchUsers(searchQuery).catch(() => [])
        setIsSearching(false)
        
        setResults({
          messages: [],
          conversations:  [],
          users: userResult || []
        })
        
        // Save to recent searches
        saveRecentSearch(searchQuery)
        
      } catch (error) {
        setIsSearching(false)
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }
    const debounceTimer = setTimeout(performSearch, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])
  
  const loadRecentSearches = () => {
    try {
      const saved = localStorage.getItem('recentSearches')
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error)
    }
  }
  
  const saveRecentSearch = (query) => {
    try {
      const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save recent search:', error)
    }
  }
  
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }
  
  const handleResultClick = (type, item) => {
    console.log("🚀 ~ handleResultClick ~ item:", item)
    if (type === 'message') {
      onNavigate?.(`/chat/${item.conversationId}?messageId=${item.id}`)
    } else if (type === 'conversation') {
      onNavigate?.(`/chat/${item.id}`)
    } else if (type === 'user') {
      // Create or navigate to conversation with user
      onNavigate?.(`/chat/new?userId=${item.id}`)
    }
    onClose()
  }
  
  const getFilteredResults = () => {
    if (activeTab == 'all') {
      return {
        messages: results.messages.slice(0, 3),
        conversations: results.conversations.slice(0, 3),
        users: results.users.slice(0, 3)
      }
    }
    
    return {
      messages: activeTab == 'messages' ? results.messages : [],
      conversations: activeTab == 'conversations' ? results.conversations : [],
      users: activeTab == 'users' ? results.users : []
    }
  }
  
  const filteredResults = getFilteredResults()
  const totalResults = results.messages.length + results.conversations.length + results.users.length
  
  const renderMessage = (message) => (
    <button
      key={message.id}
      onClick={() => handleResultClick('message', message)}
      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
    >
      <div className="flex items-start space-x-3">
        <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {message.senderName || 'Unknown User'}
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(message.createdAt)}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {truncateText(message.content, 100)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            in {message.conversationName || 'Direct Message'}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
    </button>
  )
  
  const renderConversation = (conversation) => (
    <button
      key={conversation.id}
      onClick={() => handleResultClick('conversation', conversation)}
      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <img
            src={conversation.avatar || '/default-avatar.png'}
            alt={conversation.name}
            className="w-10 h-10 rounded-full"
          />
          {conversation.type === CONVERSATION_TYPES.GROUP && (
            <Users className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full p-0.5" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {conversation.name}
            </p>
            {conversation.lastMessageAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(conversation.lastMessageAt)}
              </span>
            )}
          </div>
          {conversation.lastMessage && (
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {truncateText(conversation.lastMessage, 60)}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {conversation.type === CONVERSATION_TYPES.GROUP ? 'Group' : 'Direct Message'}
            {conversation.participantCount && ` • ${conversation.participantCount} members`}
          </p>
        </div>
        
        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
    </button>
  )
  
  const renderUser = (user) => (
    <button
      key={user.id}
      onClick={() => handleResultClick('user', user)}
      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <img
            src={user.avatar || '/default-avatar.png'}
            alt={user.username}
            className="w-10 h-10 rounded-full"
          />
          {user.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.username}
            </p>
            <User className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
            {user.email}
          </p>
          {!user.isOnline && user.lastSeen && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Last seen {formatRelativeTime(user.lastSeen)}
            </p>
          )}
        </div>
        
        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
    </button>
  )
  
  if (!isOpen) return null
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Global Search
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search Input */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages, conversations, and users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          
          {/* Tabs */}
          {searchQuery && (
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              {[
                { key: 'all', label: 'All', count: totalResults },
                { key: 'messages', label: 'Messages', count: results.messages.length },
                { key: 'conversations', label: 'Conversations', count: results.conversations.length },
                { key: 'users', label: 'Users', count: results.users.length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {!searchQuery ? (
              /* Recent Searches */
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Recent Searches
                  </h3>
                  {recentSearches.length > 0 && (
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                {recentSearches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Clock className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No recent searches
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentSearches.map((query, index) => (
                      <button
                        key={index}
                        onClick={() => setSearchQuery(query)}
                        className="w-full text-left p-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{query}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : isSearching ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : totalResults === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                <Search className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No results found for "{searchQuery}"
                </p>
              </div>
            ) : (
              <div>
                {/* Messages */}
                {filteredResults.messages.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Messages ({results.messages.length})
                      </h3>
                    </div>
                    {filteredResults.messages.map(renderMessage)}
                    {activeTab === 'all' && results.messages.length > 3 && (
                      <button
                        onClick={() => setActiveTab('messages')}
                        className="w-full p-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                      >
                        View all {results.messages.length} messages
                      </button>
                    )}
                  </div>
                )}
                
                {/* Conversations */}
                {filteredResults.conversations.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Conversations ({results.conversations.length})
                      </h3>
                    </div>
                    {filteredResults.conversations.map(renderConversation)}
                    {activeTab === 'all' && results.conversations.length > 3 && (
                      <button
                        onClick={() => setActiveTab('conversations')}
                        className="w-full p-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                      >
                        View all {results.conversations.length} conversations
                      </button>
                    )}
                  </div>
                )}
                
                {/* Users */}
                {filteredResults.users.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Users ({results.users.length})
                      </h3>
                    </div>
                    {filteredResults.users.map(renderUser)}
                    {activeTab === 'all' && results.users.length > 3 && (
                      <button
                        onClick={() => setActiveTab('users')}
                        className="w-full p-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        View all {results.users.length} users
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default GlobalSearchModal