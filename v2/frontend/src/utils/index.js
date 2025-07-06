// Date and time utilities
export const formatDate = (date, options = {}) => {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const {
    format = 'relative',
    locale = 'en-US',
    includeTime = true,
    ...intlOptions
  } = options
  
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (format === 'relative') {
    // Less than 1 minute
    if (diffMs < 60000) {
      return 'Just now'
    }
    
    // Less than 1 hour
    if (diffMs < 3600000) {
      const minutes = Math.floor(diffMs / 60000)
      return `${minutes}m ago`
    }
    
    // Same day
    if (diffDays === 0) {
      return d.toLocaleTimeString(locale, { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
      })
    }
    
    // Yesterday
    if (diffDays === 1) {
      return includeTime 
        ? `Yesterday ${d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true })}`
        : 'Yesterday'
    }
    
    // This week
    if (diffDays < 7) {
      return includeTime
        ? d.toLocaleDateString(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
        : d.toLocaleDateString(locale, { weekday: 'long' })
    }
    
    // This year
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString(locale, { 
        month: 'short', 
        day: 'numeric',
        ...(includeTime && { hour: 'numeric', minute: '2-digit', hour12: true })
      })
    }
    
    // Different year
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime && { hour: 'numeric', minute: '2-digit', hour12: true })
    })
  }
  
  return d.toLocaleDateString(locale, intlOptions)
}

export const formatTime = (date, locale = 'en-US') => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  return d.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export const formatDuration = (ms) => {
  if (!ms || ms < 0) return '0s'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export const isToday = (date) => {
  if (!date) return false
  const d = new Date(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

export const isYesterday = (date) => {
  if (!date) return false
  const d = new Date(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.toDateString() === yesterday.toDateString()
}

export const isThisWeek = (date) => {
  if (!date) return false
  const d = new Date(date)
  const now = new Date()
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
  weekStart.setHours(0, 0, 0, 0)
  return d >= weekStart
}

// String utilities
export const truncate = (str, length = 100, suffix = '...') => {
  if (!str || str.length <= length) return str
  return str.substring(0, length - suffix.length) + suffix
}

export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const camelCase = (str) => {
  if (!str) return ''
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase()
    })
    .replace(/\s+/g, '')
}

export const kebabCase = (str) => {
  if (!str) return ''
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

export const slugify = (str) => {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const escapeHtml = (str) => {
  if (!str) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export const unescapeHtml = (str) => {
  if (!str) return ''
  const div = document.createElement('div')
  div.innerHTML = str
  return div.textContent || div.innerText || ''
}

// Validation utilities
export const isEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const isPhoneNumber = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/
  return phoneRegex.test(phone?.replace(/\s/g, ''))
}

export const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false
  
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
}

export const validateUsername = (username) => {
  if (!username) return { valid: false, message: 'Username is required' }
  if (username.length < 3) return { valid: false, message: 'Username must be at least 3 characters' }
  if (username.length > 30) return { valid: false, message: 'Username must be less than 30 characters' }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' }
  }
  return { valid: true }
}

// Array utilities
export const unique = (arr, key) => {
  if (!Array.isArray(arr)) return []
  
  if (key) {
    const seen = new Set()
    return arr.filter(item => {
      const value = typeof key === 'function' ? key(item) : item[key]
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
  }
  
  return [...new Set(arr)]
}

export const groupBy = (arr, key) => {
  if (!Array.isArray(arr)) return {}
  
  return arr.reduce((groups, item) => {
    const value = typeof key === 'function' ? key(item) : item[key]
    groups[value] = groups[value] || []
    groups[value].push(item)
    return groups
  }, {})
}

export const sortBy = (arr, key, direction = 'asc') => {
  if (!Array.isArray(arr)) return []
  
  return [...arr].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key]
    const bVal = typeof key === 'function' ? key(b) : b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

export const chunk = (arr, size) => {
  if (!Array.isArray(arr) || size <= 0) return []
  
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// Object utilities
export const pick = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {}
  
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key]
    }
    return result
  }, {})
}

export const omit = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {}
  
  const keysSet = new Set(keys)
  return Object.keys(obj).reduce((result, key) => {
    if (!keysSet.has(key)) {
      result[key] = obj[key]
    }
    return result
  }, {})
}

export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const cloned = {}
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key])
    })
    return cloned
  }
}

export const deepEqual = (a, b) => {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    
    return true
  }
  
  return false
}

// Number utilities
export const formatNumber = (num, options = {}) => {
  if (typeof num !== 'number' || isNaN(num)) return '0'
  
  const {
    locale = 'en-US',
    notation = 'standard',
    compactDisplay = 'short',
    ...intlOptions
  } = options
  
  if (notation === 'compact') {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay,
      ...intlOptions
    }).format(num)
  }
  
  return new Intl.NumberFormat(locale, intlOptions).format(num)
}

export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max)
}

export const random = (min = 0, max = 1) => {
  return Math.random() * (max - min) + min
}

export const randomInt = (min = 0, max = 100) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Function utilities
export const debounce = (func, wait, immediate = false) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
  }
}

export const throttle = (func, limit) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export const memoize = (func, getKey = (...args) => JSON.stringify(args)) => {
  const cache = new Map()
  
  return function memoized(...args) {
    const key = getKey(...args)
    
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = func.apply(this, args)
    cache.set(key, result)
    return result
  }
}

// DOM utilities
export const getScrollParent = (element) => {
  if (!element) return null
  
  const style = getComputedStyle(element)
  const excludeStaticParent = style.position === 'absolute'
  const overflowRegex = /(auto|scroll)/
  
  if (style.position === 'fixed') return document.body
  
  for (let parent = element; (parent = parent.parentElement);) {
    const style = getComputedStyle(parent)
    if (excludeStaticParent && style.position === 'static') {
      continue
    }
    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
      return parent
    }
  }
  
  return document.body
}

export const isElementInViewport = (element, threshold = 0) => {
  if (!element) return false
  
  const rect = element.getBoundingClientRect()
  const windowHeight = window.innerHeight || document.documentElement.clientHeight
  const windowWidth = window.innerWidth || document.documentElement.clientWidth
  
  return (
    rect.top >= -threshold &&
    rect.left >= -threshold &&
    rect.bottom <= windowHeight + threshold &&
    rect.right <= windowWidth + threshold
  )
}

export const scrollToElement = (element, options = {}) => {
  if (!element) return
  
  const {
    behavior = 'smooth',
    block = 'start',
    inline = 'nearest',
    offset = 0
  } = options
  
  if (offset) {
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    const offsetPosition = elementPosition - offset
    
    window.scrollTo({
      top: offsetPosition,
      behavior
    })
  } else {
    element.scrollIntoView({
      behavior,
      block,
      inline
    })
  }
}

// Storage utilities
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },
  
  clear: () => {
    try {
      localStorage.clear()
      return true
    } catch {
      return false
    }
  }
}

export const sessionStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },
  
  set: (key, value) => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },
  
  remove: (key) => {
    try {
      window.sessionStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },
  
  clear: () => {
    try {
      window.sessionStorage.clear()
      return true
    } catch {
      return false
    }
  }
}

// Color utilities
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export const getContrastColor = (hexColor) => {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return '#000000'
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  return brightness > 128 ? '#000000' : '#ffffff'
}

// File utilities
export const getFileExtension = (filename) => {
  if (!filename) return ''
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

export const getFileName = (filename) => {
  if (!filename) return ''
  return filename.replace(/\.[^/.]+$/, '')
}

export const isImageFile = (filename) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
  const ext = getFileExtension(filename).toLowerCase()
  return imageExtensions.includes(ext)
}

export const isVideoFile = (filename) => {
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']
  const ext = getFileExtension(filename).toLowerCase()
  return videoExtensions.includes(ext)
}

export const isAudioFile = (filename) => {
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a']
  const ext = getFileExtension(filename).toLowerCase()
  return audioExtensions.includes(ext)
}

export const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const downloadFile = (data, filename, type = 'application/octet-stream') => {
  const blob = new Blob([data], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Error utilities
export const createError = (message, code, details = {}) => {
  const error = new Error(message)
  error.code = code
  error.details = details
  return error
}

export const isNetworkError = (error) => {
  return (
    error.code === 'NETWORK_ERROR' ||
    error.message?.includes('Network Error') ||
    error.message?.includes('fetch')
  )
}

export const getErrorMessage = (error, fallback = 'An unexpected error occurred') => {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (error?.error?.message) return error.error.message
  return fallback
}

// URL utilities
export const buildUrl = (base, path, params = {}) => {
  const url = new URL(path, base)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, value)
    }
  })
  
  return url.toString()
}

export const parseUrl = (url) => {
  try {
    const parsed = new URL(url)
    const params = {}
    
    parsed.searchParams.forEach((value, key) => {
      params[key] = value
    })
    
    return {
      protocol: parsed.protocol,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      params
    }
  } catch {
    return null
  }
}

// Device utilities
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export const isTablet = () => {
  return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent)
}

export const isDesktop = () => {
  return !isMobile() && !isTablet()
}

export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export const getDeviceType = () => {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}

// Performance utilities
export const measurePerformance = (name, fn) => {
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  
  console.log(`${name} took ${end - start} milliseconds`)
  return result
}

export const measureAsyncPerformance = async (name, fn) => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  
  console.log(`${name} took ${end - start} milliseconds`)
  return result
}

// Crypto utilities
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const hashString = async (str) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Additional utility functions
export const formatRelativeTime = (date) => {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now - targetDate) / 1000)
  
  if (diffInSeconds < 60) {
    return 'just now'
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`
  }
  
  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`
  }
  
  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears}y ago`
}

export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - suffix.length) + suffix
}

export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const result = document.execCommand('copy')
      document.body.removeChild(textArea)
      return result
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}