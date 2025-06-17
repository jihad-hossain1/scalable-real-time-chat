```js
// =============================================================================
// BACKEND IMPLEMENTATION
// =============================================================================

// package.json
{
  "name": "realtime-chat-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "mysql2": "^3.6.0",
    "amqplib": "^0.10.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}

// .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chat_app
JWT_SECRET=your_jwt_secret_key
RABBITMQ_URL=amqp://localhost
PORT=3001

// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Messages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        message_type ENUM('text', 'image', 'file') DEFAULT 'text',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_sender_receiver (sender_id, receiver_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Typing indicators table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS typing_indicators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        chat_with_user_id INT NOT NULL,
        is_typing BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (chat_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_typing (user_id, chat_with_user_id)
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

module.exports = { pool, initializeDatabase };

// config/rabbitmq.js
const amqp = require('amqplib');
require('dotenv').config();

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      
      // Declare exchanges and queues
      await this.channel.assertExchange('chat_exchange', 'direct', { durable: true });
      await this.channel.assertQueue('message_queue', { durable: true });
      await this.channel.assertQueue('notification_queue', { durable: true });
      await this.channel.assertQueue('typing_queue', { durable: true });
      
      console.log('RabbitMQ connected successfully');
    } catch (error) {
      console.error('RabbitMQ connection error:', error);
    }
  }

  async publishMessage(queue, message) {
    try {
      await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true
      });
    } catch (error) {
      console.error('Error publishing message:', error);
    }
  }

  async consumeMessages(queue, callback) {
    try {
      await this.channel.consume(queue, (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          callback(content);
          this.channel.ack(msg);
        }
      });
    } catch (error) {
      console.error('Error consuming messages:', error);
    }
  }
}

module.exports = new RabbitMQService();

// middleware/auth.js
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateToken };

// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET);
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.insertId, username, email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Update online status
    await pool.execute('UPDATE users SET is_online = TRUE WHERE id = ?', [user.id]);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      is_online: req.user.is_online
    }
  });
});

module.exports = router;

// routes/users.js
const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all users except current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, is_online, last_seen FROM users WHERE id != ?',
      [req.user.id]
    );
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, is_online, last_seen FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;

// routes/messages.js
const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const rabbitmq = require('../config/rabbitmq');

const router = express.Router();

// Get chat history between two users
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const [messages] = await pool.execute(`
      SELECT m.*, 
             sender.username as sender_username,
             receiver.username as receiver_username
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) 
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, userId, userId, req.user.id, parseInt(limit), offset]);

    // Mark messages as read
    await pool.execute(
      'UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE',
      [userId, req.user.id]
    );

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiver_id, message, message_type = 'text' } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO messages (sender_id, receiver_id, message, message_type) VALUES (?, ?, ?, ?)',
      [req.user.id, receiver_id, message, message_type]
    );

    const [newMessage] = await pool.execute(`
      SELECT m.*, 
             sender.username as sender_username,
             receiver.username as receiver_username
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE m.id = ?
    `, [result.insertId]);

    // Publish to RabbitMQ for real-time delivery
    await rabbitmq.publishMessage('message_queue', {
      type: 'new_message',
      message: newMessage[0]
    });

    res.status(201).json({ message: newMessage[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get unread message count
router.get('/unread/:userId', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE',
      [req.user.id, req.params.userId]
    );
    
    res.json({ unread_count: result[0].count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

module.exports = router;

// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initializeDatabase, pool } = require('./config/database');
const rabbitmq = require('./config/rabbitmq');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Socket.io connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user authentication
  socket.on('authenticate', async (data) => {
    try {
      const { userId, username } = data;
      
      // Store user connection
      connectedUsers.set(userId, {
        socketId: socket.id,
        username,
        userId
      });

      // Update online status in database
      await pool.execute('UPDATE users SET is_online = TRUE WHERE id = ?', [userId]);

      // Join user to their own room
      socket.join(`user_${userId}`);

      // Broadcast online status
      socket.broadcast.emit('user_online', { userId, username });

      console.log(`User ${username} authenticated with ID: ${userId}`);
    } catch (error) {
      console.error('Authentication error:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing_start', async (data) => {
    try {
      const { userId, chatWithUserId } = data;
      
      // Update typing status in database
      await pool.execute(`
        INSERT INTO typing_indicators (user_id, chat_with_user_id, is_typing) 
        VALUES (?, ?, TRUE)
        ON DUPLICATE KEY UPDATE is_typing = TRUE, updated_at = CURRENT_TIMESTAMP
      `, [userId, chatWithUserId]);

      // Emit to specific user
      socket.to(`user_${chatWithUserId}`).emit('user_typing', {
        userId,
        isTyping: true
      });

      // Publish to RabbitMQ
      await rabbitmq.publishMessage('typing_queue', {
        type: 'typing_start',
        userId,
        chatWithUserId
      });
    } catch (error) {
      console.error('Typing start error:', error);
    }
  });

  socket.on('typing_stop', async (data) => {
    try {
      const { userId, chatWithUserId } = data;
      
      // Update typing status in database
      await pool.execute(
        'UPDATE typing_indicators SET is_typing = FALSE WHERE user_id = ? AND chat_with_user_id = ?',
        [userId, chatWithUserId]
      );

      // Emit to specific user
      socket.to(`user_${chatWithUserId}`).emit('user_typing', {
        userId,
        isTyping: false
      });

      // Publish to RabbitMQ
      await rabbitmq.publishMessage('typing_queue', {
        type: 'typing_stop',
        userId,
        chatWithUserId
      });
    } catch (error) {
      console.error('Typing stop error:', error);
    }
  });

  // Handle message read status
  socket.on('mark_messages_read', async (data) => {
    try {
      const { senderId, receiverId } = data;
      
      await pool.execute(
        'UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE',
        [senderId, receiverId]
      );

      // Notify sender that messages were read
      socket.to(`user_${senderId}`).emit('messages_read', {
        readBy: receiverId
      });
    } catch (error) {
      console.error('Mark messages read error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      // Find and remove user from connected users
      let disconnectedUserId = null;
      for (const [userId, userData] of connectedUsers.entries()) {
        if (userData.socketId === socket.id) {
          disconnectedUserId = userId;
          connectedUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        // Update offline status in database
        await pool.execute(
          'UPDATE users SET is_online = FALSE, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
          [disconnectedUserId]
        );

        // Clear typing indicators
        await pool.execute(
          'UPDATE typing_indicators SET is_typing = FALSE WHERE user_id = ?',
          [disconnectedUserId]
        );

        // Broadcast offline status
        socket.broadcast.emit('user_offline', { userId: disconnectedUserId });
      }

      console.log('User disconnected:', socket.id);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
});

// RabbitMQ message consumers
async function setupMessageConsumers() {
  // Handle new messages
  await rabbitmq.consumeMessages('message_queue', (data) => {
    if (data.type === 'new_message') {
      const message = data.message;
      // Emit to receiver
      io.to(`user_${message.receiver_id}`).emit('new_message', message);
      
      // Emit notification
      io.to(`user_${message.receiver_id}`).emit('notification', {
        type: 'message',
        from: message.sender_username,
        message: message.message.substring(0, 50) + (message.message.length > 50 ? '...' : '')
      });
    }
  });

  // Handle notifications
  await rabbitmq.consumeMessages('notification_queue', (data) => {
    if (data.userId) {
      io.to(`user_${data.userId}`).emit('notification', data);
    }
  });
}

// Initialize services
async function initializeServices() {
  try {
    await initializeDatabase();
    await rabbitmq.connect();
    await setupMessageConsumers();
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Service initialization error:', error);
  }
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeServices();
});

// =============================================================================
// FRONTEND IMPLEMENTATION (React)
// =============================================================================

// package.json (Frontend)
{
  "name": "realtime-chat-frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "socket.io-client": "^4.7.2",
    "axios": "^1.5.0",
    "react-router-dom": "^6.15.0",
    "react-hook-form": "^7.45.4",
    "date-fns": "^2.30.0",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.263.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "devDependencies": {
    "react-scripts": "^5.0.1",
    "tailwindcss": "^3.3.3"
  }
}

// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
};

export const userAPI = {
  getUsers: () => api.get('/users'),
  getUser: (id) => api.get(`/users/${id}`),
};

export const messageAPI = {
  getMessages: (userId, page = 1, limit = 50) => 
    api.get(`/messages/${userId}?page=${page}&limit=${limit}`),
  sendMessage: (messageData) => api.post('/messages', messageData),
  getUnreadCount: (userId) => api.get(`/messages/unread/${userId}`),
};

export default api;

// src/services/socket.js
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket) return;

    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  authenticate(user) {
    if (this.socket) {
      this.socket.emit('authenticate', {
        userId: user.id,
        username: user.username
      });
    }
  }

  // Message events
  sendMessage(messageData) {
    if (this.socket) {
      this.socket.emit('send_message', messageData);
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  // Typing events
  startTyping(userId, chatWithUserId) {
    if (this.socket) {
      this.socket.emit('typing_start', { userId, chatWithUserId });
    }
  }

  stopTyping(userId, chatWithUserId) {
    if (this.socket) {
      this.socket.emit('typing_stop', { userId, chatWithUserId });
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  // Online status events
  onUserOnline(callback) {
    if (this.socket) {
      this.socket.on('user_online', callback);
    }
  }

  onUserOffline(callback) {
    if (this.socket) {
      this.socket.on('user_offline', callback);
    }
  }

  // Read status events
  markMessagesRead(senderId, receiverId) {
    if (this.socket) {
      this.socket.emit('mark_messages_read', { senderId, receiverId });
    }
  }

  onMessagesRead(callback) {
    if (this.socket) {
      this.socket.on('messages_read', callback);
    }
  }

  // Notification events
  onNotification(callback) {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  // Remove event listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();

// src/hooks/useSocket.js
import { useEffect, useContext } from 'react';
import socketService from '../services/socket';
import { AuthContext } from '../contexts/AuthContext';

export const useSocket = () => {
  const { user, token } = useContext(AuthContext);

  useEffect(() => {
    if (user && token) {
      socketService.connect(token);
      socketService.authenticate(user);

      return () => {
        socketService.removeAllListeners();
      };
    }
  }, [user, token]);

  return socketService;
};

// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authAPI.getCurrentUser();
          setUser(response.data.user);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    
    return response.data;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    const { token: newToken, user: newUser } = response.data;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// src/components/Login.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AuthContext } from '../contexts/AuthContext';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data);
      toast.success('Login successful!');
      navigate('/chat');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              {...register('username', { required: 'Username is required' })}
              type="text"
              className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your username"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              {...register('password', { required: 'Password is required' })}
              type="password"
              className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign up
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

// src/components/Register.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AuthContext } from '../contexts/AuthContext';

const Register = () => {
  const { register: registerUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerUser(data);
      toast.success('Registration successful!');
      navigate('/chat');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              {...register('username', { 
                required: 'Username is required',
                minLength: { value: 3, message: 'Username must be at least 3 characters' }
              })}
              type="text"
              className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your username"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              type="email"
              className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              {...register('password', { 
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' }
              })}
              type="password"
              className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
              type="password"
              className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;

// src/components/UserList.js
import React, { useState, useEffect, useContext } from 'react';
import { userAPI } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { Circle, User } from 'lucide-react';

const UserList = ({ selectedUser, onUserSelect }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketService = useSocket();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Listen for online/offline status changes
    socketService.onUserOnline((data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    });

    socketService.onUserOffline((data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, [socketService]);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getUsers();
      setUsers(response.data.users);
      
      // Initialize online users
      const initialOnlineUsers = new Set(
        response.data.users.filter(user => user.is_online).map(user => user.id)
      );
      setOnlineUsers(initialOnlineUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const getLastSeenText = (user) => {
    if (isUserOnline(user.id)) {
      return 'Online';
    }
    
    if (user.last_seen) {
      return `Last seen ${formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}`;
    }
    
    return 'Offline';
  };

  if (loading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
        <p className="text-sm text-gray-500">Welcome, {currentUser?.username}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No other users found
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              onClick={() => onUserSelect(user)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    isUserOnline(user.id) ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {user.username}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <Circle 
                        className={`w-2 h-2 fill-current ${
                          isUserOnline(user.id) ? 'text-green-500' : 'text-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {getLastSeenText(user)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;

// src/components/ChatWindow.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { messageAPI } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { Send, User, Circle } from 'lucide-react';
import toast from 'react-hot-toast';

const ChatWindow = ({ selectedUser, onlineUsers }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketService = useSocket();

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for new messages
    socketService.onNewMessage((message) => {
      if (
        (message.sender_id === selectedUser?.id && message.receiver_id === currentUser?.id) ||
        (message.sender_id === currentUser?.id && message.receiver_id === selectedUser?.id)
      ) {
        setMessages(prev => [...prev, message]);
        
        // Mark as read if it's from the selected user
        if (message.sender_id === selectedUser?.id) {
          markMessagesAsRead();
        }
      }
    });

    // Listen for typing indicators
    socketService.onUserTyping((data) => {
      if (data.userId === selectedUser?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      }
    });

    // Listen for message read confirmations
    socketService.onMessagesRead((data) => {
      if (data.readBy === selectedUser?.id) {
        setMessages(prev => 
          prev.map(msg => 
            msg.sender_id === currentUser?.id && msg.receiver_id === selectedUser?.id
              ? { ...msg, is_read: true }
              : msg
          )
        );
      }
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, [selectedUser, currentUser, socketService]);

  const fetchMessages = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const response = await messageAPI.getMessages(selectedUser.id);
      setMessages(response.data.messages);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = () => {
    if (selectedUser && currentUser) {
      socketService.markMessagesRead(selectedUser.id, currentUser.id);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await messageAPI.sendMessage({
        receiver_id: selectedUser.id,
        message: messageText,
        message_type: 'text'
      });
    } catch (error) {
      toast.error('Failed to send message');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing start event
    if (e.target.value.length > 0) {
      socketService.startTyping(currentUser.id, selectedUser.id);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(currentUser.id, selectedUser.id);
    }, 1000);
  };

  const isUserOnline = (userId) => {
    return onlineUsers?.has(userId) || false;
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Welcome to Real-time Chat
          </h3>
          <p className="text-gray-500">
            Select a user from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              isUserOnline(selectedUser.id) ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedUser.username}
            </h3>
            <div className="flex items-center space-x-2">
              <Circle 
                className={`w-2 h-2 fill-current ${
                  isUserOnline(selectedUser.id) ? 'text-green-500' : 'text-gray-400'
                }`}
              />
              <p className="text-sm text-gray-500">
                {isUserOnline(selectedUser.id) 
                  ? 'Online' 
                  : selectedUser.last_seen 
                    ? `Last seen ${formatDistanceToNow(new Date(selectedUser.last_seen), { addSuffix: true })}`
                    : 'Offline'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender_id === currentUser.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.message}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${
                    message.sender_id === currentUser.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                  {message.sender_id === currentUser.id && (
                    <div className={`text-xs ${
                      message.is_read ? 'text-blue-100' : 'text-blue-200'
                    }`}>
                      {message.is_read ? '✓✓' : '✓'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {typingUsers.has(selectedUser.id) && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;

// src/components/Chat.js
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import UserList from './UserList';
import ChatWindow from './ChatWindow';
import toast, { Toaster } from 'react-hot-toast';
import { LogOut } from 'lucide-react';

const Chat = () => {
  const { user, logout } = useContext(AuthContext);
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketService = useSocket();

  useEffect(() => {
    // Listen for notifications
    socketService.onNotification((notification) => {
      if (notification.type === 'message') {
        toast.success(`New message from ${notification.from}: ${notification.message}`, {
          duration: 4000,
        });
      }
    });

    // Listen for online/offline status changes
    socketService.onUserOnline((data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
      toast.success(`${data.username} is now online`, { duration: 2000 });
    });

    socketService.onUserOffline((data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, [socketService]);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const handleLogout = () => {
    socketService.disconnect();
    logout();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Real-time Chat</h1>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex overflow-hidden">
        <UserList 
          selectedUser={selectedUser} 
          onUserSelect={handleUserSelect}
        />
        <ChatWindow 
          selectedUser={selectedUser}
          onlineUsers={onlineUsers}
        />
      </div>

      <Toaster position="top-right" />
    </div>
  );
};

export default Chat;

// src/components/ProtectedRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

// src/App.css
@tailwind base;
@tailwind components;
@tailwind utilities;

.App {
  height: 100vh;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Animations */
@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.animate-bounce {
  animation: bounce 1.4s infinite ease-in-out both;
}

// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// =============================================================================
// DEPLOYMENT & SETUP INSTRUCTIONS
// =============================================================================

/*
SETUP INSTRUCTIONS:

1. Backend Setup:
   - Install Node.js and npm
   - Install MySQL and RabbitMQ
   - Create a new directory for backend
   - Copy backend files and run: npm install
   - Create .env file with your database and RabbitMQ credentials
   - Start MySQL and RabbitMQ services
   - Run: npm run dev

2. Frontend Setup:
   - Create a new React app: npx create-react-app realtime-chat-frontend
   - Replace default files with the frontend code above
   - Install dependencies: npm install
   - Install

```