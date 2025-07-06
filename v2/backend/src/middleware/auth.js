import { authService } from '../services/auth.js';
import { redisService } from '../services/redis.js';

// JWT Authentication middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Validate session
    const { user, decoded } = await authService.validateSession(token);
    
    // Attach user info to request
    req.user = user;
    req.userId = user.id;
    req.tokenData = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.message.includes('expired')) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
};

// Optional authentication (for routes that work with or without auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const { user, decoded } = await authService.validateSession(token);
      req.user = user;
      req.userId = user.id;
      req.tokenData = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Socket.IO authentication middleware
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Validate session
    const { user, decoded } = await authService.validateSession(token);
    
    // Attach user info to socket
    socket.user = user;
    socket.userId = user.id;
    socket.tokenData = decoded;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
};

// Rate limiting middleware
export const rateLimiter = (requests = 100, windowMs = 60000) => {
  return async (req, res, next) => {
    try {
      const key = `rate_limit:${req.ip}:${req.path}`;
      const windowSeconds = Math.floor(windowMs / 1000);
      
      const allowed = await redisService.checkRateLimit(key, requests, windowSeconds);
      
      if (!allowed) {
        return res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: windowSeconds
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting if Redis fails
      next();
    }
  };
};

// User-specific rate limiting
export const userRateLimiter = (requests = 50, windowMs = 60000) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return next();
      }
      
      const key = `user_rate_limit:${req.userId}:${req.path}`;
      const windowSeconds = Math.floor(windowMs / 1000);
      
      const allowed = await redisService.checkRateLimit(key, requests, windowSeconds);
      
      if (!allowed) {
        return res.status(429).json({
          error: 'Too many requests',
          code: 'USER_RATE_LIMIT_EXCEEDED',
          retryAfter: windowSeconds
        });
      }
      
      next();
    } catch (error) {
      console.error('User rate limiting error:', error);
      next();
    }
  };
};

// Admin role check
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Validate request body
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }
    
    req.body = value;
    next();
  };
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  // Database errors
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE'
    });
  }
  
  if (err.code === '23503') { // Foreign key constraint violation
    return res.status(400).json({
      error: 'Invalid reference',
      code: 'INVALID_REFERENCE'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
};

// CORS middleware
export const corsMiddleware = (req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};