// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
}

// Socket Events
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',
  
  // Authentication events
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  AUTHENTICATION_ERROR: 'authentication_error',
  UNAUTHORIZED: 'unauthorized',
  
  // Message events
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_EDITED: 'message:edited',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_REACT: 'message:react',
  MESSAGE_REACTION: 'message:reaction',
  MESSAGE_READ: 'message:read',
  MESSAGE_STATUS: 'message:status',
  
  // Typing events
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_STATUS: 'typing:status',
  
  // Presence events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_STATUS: 'user:status',
  PRESENCE_UPDATE: 'presence:update',
  
  // Conversation events
  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',
  CONVERSATION_UPDATE: 'conversation:update',
  CONVERSATION_DELETE: 'conversation:delete',
  
  // Group events
  GROUP_CREATE: 'group:create',
  GROUP_UPDATE: 'group:update',
  GROUP_DELETE: 'group:delete',
  GROUP_MEMBER_ADD: 'group:member:add',
  GROUP_MEMBER_REMOVE: 'group:member:remove',
  GROUP_MEMBER_UPDATE: 'group:member:update',
  
  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DELETE: 'notification:delete',
  
  // Call events
  CALL_INITIATE: 'call:initiate',
  CALL_ACCEPT: 'call:accept',
  CALL_REJECT: 'call:reject',
  CALL_END: 'call:end',
  CALL_SIGNAL: 'call:signal',
  
  // System events
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
  HEALTH_CHECK: 'health:check'
}

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  LOCATION: 'location',
  CONTACT: 'contact',
  STICKER: 'sticker',
  GIF: 'gif',
  POLL: 'poll',
  SYSTEM: 'system'
}

// Message Status
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
}

// User Status
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy',
  INVISIBLE: 'invisible'
}

// Conversation Types
export const CONVERSATION_TYPES = {
  DIRECT: 'direct',
  GROUP: 'group',
  CHANNEL: 'channel'
}

// Group Roles
export const GROUP_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member'
}

// Notification Types
export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  MENTION: 'mention',
  REPLY: 'reply',
  REACTION: 'reaction',
  GROUP_INVITE: 'group_invite',
  GROUP_UPDATE: 'group_update',
  FRIEND_REQUEST: 'friend_request',
  CALL: 'call',
  SYSTEM: 'system'
}

// File Types
export const FILE_TYPES = {
  IMAGE: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml']
  },
  VIDEO: {
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    maxSize: 100 * 1024 * 1024, // 100MB
    mimeTypes: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/x-matroska']
  },
  AUDIO: {
    extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'],
    maxSize: 50 * 1024 * 1024, // 50MB
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/mp4']
  },
  DOCUMENT: {
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'],
    maxSize: 25 * 1024 * 1024, // 25MB
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/rtf'
    ]
  },
  ARCHIVE: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    maxSize: 50 * 1024 * 1024, // 50MB
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip'
    ]
  }
}

// Theme Configuration
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
}

// Language Configuration
export const LANGUAGES = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  IT: 'it',
  PT: 'pt',
  RU: 'ru',
  ZH: 'zh',
  JA: 'ja',
  KO: 'ko',
  AR: 'ar'
}

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MM/dd/yyyy',
  MEDIUM: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  FULL: 'EEEE, MMMM dd, yyyy',
  TIME: 'HH:mm',
  TIME_12: 'h:mm a',
  DATETIME: 'MM/dd/yyyy HH:mm',
  DATETIME_12: 'MM/dd/yyyy h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
}

// Validation Rules
export const VALIDATION_RULES = {
  USERNAME: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  PASSWORD: {
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
    message: 'Password must be 8-128 characters with at least one uppercase, lowercase, number, and special character'
  },
  PHONE: {
    pattern: /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/,
    message: 'Please enter a valid phone number'
  },
  GROUP_NAME: {
    minLength: 1,
    maxLength: 100,
    message: 'Group name must be 1-100 characters'
  },
  MESSAGE: {
    maxLength: 4000,
    message: 'Message must be less than 4000 characters'
  }
}

// Error Codes
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  BAD_GATEWAY: 'BAD_GATEWAY',
  
  // File errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS'
}

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
}

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  CHAT_DRAFTS: 'chat_drafts',
  NOTIFICATION_SETTINGS: 'notification_settings',
  CHAT_SETTINGS: 'chat_settings',
  LAST_ACTIVITY: 'last_activity',
  DEVICE_ID: 'device_id'
}

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000
}

// Breakpoints
export const BREAKPOINTS = {
  XS: 480,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
}

// Z-Index Layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080
}

// Chat Configuration
export const CHAT_CONFIG = {
  MESSAGE_LOAD_LIMIT: 50,
  TYPING_TIMEOUT: 3000,
  TYPING_DEBOUNCE: 1000,
  PRESENCE_UPDATE_INTERVAL: 30000,
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
  PING_INTERVAL: 25000,
  PONG_TIMEOUT: 5000
}

// Export individual constants for convenience
export const TYPING_TIMEOUT = CHAT_CONFIG.TYPING_TIMEOUT

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  DEFAULT_DURATION: 5000,
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 7000,
  WARNING_DURATION: 5000,
  INFO_DURATION: 4000,
  MAX_NOTIFICATIONS: 5,
  POSITION: 'top-right'
}

// Feature Flags
export const FEATURES = {
  VOICE_MESSAGES: import.meta.env.VITE_FEATURE_VOICE_MESSAGES === 'true',
  VIDEO_CALLS: import.meta.env.VITE_FEATURE_VIDEO_CALLS === 'true',
  FILE_SHARING: import.meta.env.VITE_FEATURE_FILE_SHARING === 'true',
  SCREEN_SHARING: import.meta.env.VITE_FEATURE_SCREEN_SHARING === 'true',
  MESSAGE_REACTIONS: import.meta.env.VITE_FEATURE_MESSAGE_REACTIONS === 'true',
  MESSAGE_THREADS: import.meta.env.VITE_FEATURE_MESSAGE_THREADS === 'true',
  TYPING_INDICATORS: import.meta.env.VITE_FEATURE_TYPING_INDICATORS === 'true',
  READ_RECEIPTS: import.meta.env.VITE_FEATURE_READ_RECEIPTS === 'true',
  PUSH_NOTIFICATIONS: import.meta.env.VITE_FEATURE_PUSH_NOTIFICATIONS === 'true',
  DARK_MODE: import.meta.env.VITE_FEATURE_DARK_MODE === 'true',
  EMOJI_PICKER: import.meta.env.VITE_FEATURE_EMOJI_PICKER === 'true',
  MESSAGE_SEARCH: import.meta.env.VITE_FEATURE_MESSAGE_SEARCH === 'true',
  USER_PRESENCE: import.meta.env.VITE_FEATURE_USER_PRESENCE === 'true',
  GROUP_CHAT: import.meta.env.VITE_FEATURE_GROUP_CHAT === 'true',
  MESSAGE_ENCRYPTION: import.meta.env.VITE_FEATURE_MESSAGE_ENCRYPTION === 'true'
}

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  VIRTUAL_SCROLL_THRESHOLD: 100,
  IMAGE_LAZY_LOAD_THRESHOLD: 200,
  DEBOUNCE_SEARCH: 300,
  THROTTLE_SCROLL: 100,
  THROTTLE_RESIZE: 250,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100
}

// Security Configuration
export const SECURITY_CONFIG = {
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  CSRF_TOKEN_HEADER: 'X-CSRF-Token',
  CONTENT_SECURITY_POLICY: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'wss:', 'https:']
  }
}

// Default User Settings
export const DEFAULT_USER_SETTINGS = {
  theme: THEMES.SYSTEM,
  language: LANGUAGES.EN,
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    push: true,
    mentions: true,
    directMessages: true,
    groupMessages: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  },
  privacy: {
    showOnlineStatus: true,
    showLastSeen: true,
    showReadReceipts: true,
    allowDirectMessages: true,
    allowGroupInvites: true
  },
  chat: {
    enterToSend: true,
    showTypingIndicators: true,
    showReadReceipts: true,
    autoDownloadImages: true,
    autoDownloadVideos: false,
    autoDownloadAudio: true,
    fontSize: 'medium',
    messageGrouping: true,
    showTimestamps: true,
    compactMode: false
  },
  media: {
    autoPlayVideos: false,
    autoPlayGifs: true,
    imageQuality: 'high',
    videoQuality: 'medium'
  }
}

// Emoji Categories
export const EMOJI_CATEGORIES = {
  RECENT: 'recent',
  SMILEYS: 'smileys',
  PEOPLE: 'people',
  ANIMALS: 'animals',
  FOOD: 'food',
  TRAVEL: 'travel',
  ACTIVITIES: 'activities',
  OBJECTS: 'objects',
  SYMBOLS: 'symbols',
  FLAGS: 'flags'
}

// Regular Expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
  MENTION: /@([a-zA-Z0-9_-]+)/g,
  HASHTAG: /#([a-zA-Z0-9_-]+)/g,
  PHONE: /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/,
  USERNAME: /^[a-zA-Z0-9_-]+$/,
  EMOJI: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
}

// Color Palette
export const COLORS = {
  PRIMARY: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  },
  GRAY: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  },
  SUCCESS: {
    50: '#ecfdf5',
    500: '#10b981',
    600: '#059669'
  },
  WARNING: {
    50: '#fffbeb',
    500: '#f59e0b',
    600: '#d97706'
  },
  ERROR: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626'
  },
  INFO: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb'
  }
}