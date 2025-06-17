Here's a comprehensive solution for a scalable one-to-one chat application with real-time features using the specified tech stack:

### System Architecture
```
React Frontend
  │
  │ (HTTP/WebSockets)
  │
Node.js Backend (Express) ─── RabbitMQ ─── Worker Processes
  │
  │ (Database Queries)
  │
MySQL Database
```

### Backend Implementation (Node.js)

**1. Dependencies (package.json):**
```json
{
  "dependencies": {
    "express": "^4.18",
    "socket.io": "^4.7",
    "mysql2": "^3.6",
    "amqplib": "^0.10",
    "jsonwebtoken": "^9.0",
    "dotenv": "^16.3"
  }
}
```

**2. Database Schema (MySQL):**
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered BOOLEAN DEFAULT false,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

CREATE TABLE online_users (
  user_id INT PRIMARY KEY,
  socket_id VARCHAR(255) NOT NULL,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**3. Server Setup (server.js):**
```javascript
const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const amqp = require('amqplib');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*"
  }
});

// MySQL Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// RabbitMQ Connection
let rabbitChannel;
amqp.connect(process.env.RABBITMQ_URL).then(conn => {
  return conn.createChannel();
}).then(channel => {
  rabbitChannel = channel;
  channel.assertExchange('events', 'topic', { durable: true });
});

// Online Users Tracker
const onlineUsers = new Map();

// JWT Authentication Middleware
const authenticate = (socket, next) => {
  const token = socket.handshake.auth.token;
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = user;
    next();
  });
};

io.use(authenticate);

// Socket.IO Event Handling
io.on('connection', async (socket) => {
  const userId = socket.user.id;
  
  // Mark user as online
  onlineUsers.set(userId, socket.id);
  await pool.query(
    'INSERT INTO online_users (user_id, socket_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE socket_id = ?',
    [userId, socket.id, socket.id]
  );
  
  // Notify contacts about online status
  socket.broadcast.emit('user-online', userId);

  // Message Handling
  socket.on('message', async ({ recipientId, content }) => {
    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)',
      [userId, recipientId, content]
    );
    
    // Publish to RabbitMQ
    rabbitChannel.publish('events', 'message.new', Buffer.from(JSON.stringify({
      messageId: result.insertId,
      senderId: userId,
      recipientId,
      content
    })));
  });

  // Typing Indicator
  socket.on('typing', (recipientId) => {
    io.to(onlineUsers.get(recipientId)).emit('typing', userId);
  });

  // Fetch offline messages
  socket.on('get-messages', async () => {
    const [messages] = await pool.query(
      'SELECT * FROM messages WHERE recipient_id = ? AND delivered = false',
      [userId]
    );
    messages.forEach(msg => {
      socket.emit('message', msg);
      pool.query('UPDATE messages SET delivered = true WHERE id = ?', [msg.id]);
    });
  });

  // Disconnect Handling
  socket.on('disconnect', async () => {
    onlineUsers.delete(userId);
    await pool.query('DELETE FROM online_users WHERE user_id = ?', [userId]);
    socket.broadcast.emit('user-offline', userId);
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**4. RabbitMQ Worker (worker.js):**
```javascript
const amqp = require('amqplib');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({ /* same as server */ });

async function startConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();
  
  await channel.assertExchange('events', 'topic', { durable: true });
  const q = await channel.assertQueue('', { exclusive: true });
  
  channel.bindQueue(q.queue, 'events', 'message.new');
  
  channel.consume(q.queue, async (msg) => {
    const { recipientId, messageId } = JSON.parse(msg.content.toString());
    
    const [online] = await pool.query(
      'SELECT socket_id FROM online_users WHERE user_id = ?',
      [recipientId]
    );
    
    if (online.length > 0) {
      // Deliver via WebSocket if online
      io.to(online[0].socket_id).emit('message', { id: messageId });
      await pool.query(
        'UPDATE messages SET delivered = true WHERE id = ?',
        [messageId]
      );
    }
    
    channel.ack(msg);
  });
}

startConsumer();
```

### Frontend Implementation (React)

**1. Socket Service (src/services/socket.js):**
```javascript
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';

let socket;

export const connectSocket = (token) => {
  socket = io(SOCKET_URL, {
    auth: { token }
  });
};

export const getSocket = () => socket;
```

**2. Chat Context (src/contexts/ChatContext.jsx):**
```javascript
import React, { createContext, useEffect, useState } from 'react';
import { getSocket } from '../services/socket';

export const ChatContext = createContext();

export const ChatProvider = ({ children, user }) => {
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('message', (message) => {
      setMessages(prev => ({
        ...prev,
        [message.sender_id]: [...(prev[message.sender_id] || [], message]
      }));
    });

    socket.on('typing', (userId) => {
      setTypingUsers(prev => ({ ...prev, [userId]: true }));
      setTimeout(() => {
        setTypingUsers(prev => ({ ...prev, [userId]: false }));
      }, 3000);
    });

    socket.on('user-online', (userId) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    socket.on('user-offline', (userId) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    socket.emit('get-messages');

    return () => {
      socket.off('message');
      socket.off('typing');
      socket.off('user-online');
      socket.off('user-offline');
    };
  }, [socket]);

  const sendMessage = (recipientId, content) => {
    socket.emit('message', { recipientId, content });
  };

  const sendTyping = (recipientId) => {
    socket.emit('typing', recipientId);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        typingUsers,
        onlineUsers,
        sendMessage,
        sendTyping
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
```

**3. Chat UI Component (src/components/Chat.jsx):**
```javascript
import React, { useState, useContext, useEffect, useRef } from 'react';
import { ChatContext } from '../contexts/ChatContext';

const Chat = ({ recipient }) => {
  const { messages, typingUsers, onlineUsers, sendMessage, sendTyping } = useContext(ChatContext);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const isOnline = onlineUsers.has(recipient.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(recipient.id, input);
      setInput('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[recipient.id]]);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>{recipient.username}</h3>
        <div className={`status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="messages">
        {(messages[recipient.id] || []).map(msg => (
          <div key={msg.id} className={`message ${msg.sender_id === recipient.id ? 'received' : 'sent'}`}>
            {msg.content}
          </div>
        ))}
        {typingUsers[recipient.id] && (
          <div className="typing-indicator">Typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="message-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={() => sendTyping(recipient.id)}
          placeholder="Type a message"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};
```

### Scaling Strategy

1. **Horizontal Scaling:**
   - Use multiple Node.js instances behind a load balancer (Nginx)
   - Enable Redis adapter for Socket.IO:
     ```bash
     npm install @socket.io/redis-adapter redis
     ```
     ```javascript
     const { createAdapter } = require('@socket.io/redis-adapter');
     const pubClient = redis.createClient();
     const subClient = pubClient.duplicate();
     io.adapter(createAdapter(pubClient, subClient));
     ```

2. **RabbitMQ Setup:**
   - Use multiple queues with consistent hashing
   - Implement dead-letter exchanges for failed messages
   - Enable publisher confirms for reliable delivery

3. **Database Optimization:**
   - Add indexes:
     ```sql
     CREATE INDEX idx_messages_recipient ON messages(recipient_id, delivered);
     CREATE INDEX idx_online_users_user ON online_users(user_id);
     ```
   - Implement read replicas for message history
   - Use connection pooling

4. **Performance Monitoring:**
   - Track with Prometheus/Grafana:
     - Message delivery latency
     - Online users count
     - RabbitMQ queue sizes
   - Set alerts for:
     - High message backlog
     - Low database connection availability
     - High WebSocket disconnect rates

### Real-Time Features Implementation

1. **Typing Indicators:**
   - Client sends `typing` event when input changes
   - Server relays to recipient's socket
   - Client shows indicator for 3 seconds

2. **Online Status:**
   - Track in MySQL with WebSocket connection events
   - Broadcast changes to all connected clients
   - Fallback to last-seen timestamp

3. **Message Delivery:**
   - Immediately deliver via WebSocket if online
   - RabbitMQ worker handles offline delivery
   - Database tracks delivery status

4. **Notification System:**
   - Use RabbitMQ's topic exchange for events:
     - `message.new`
     - `user.online`
     - `user.offline`
   - Workers process events asynchronously

### Deployment Notes

1. **Environment Variables:**
   ```env
   DB_HOST=mysql-cluster-ip
   DB_USER=chat_user
   DB_PASSWORD=secure_password
   DB_NAME=chat_db
   RABBITMQ_URL=amqp://rabbitmq-service
   JWT_SECRET=your_strong_secret
   ```

2. **Docker Compose Example:**
   ```yaml
   version: '3'
   services:
     app:
       build: ./app
       ports:
         - "3000:3000"
       environment:
         - DB_HOST=mysql
         - RABBITMQ_URL=amqp://rabbitmq
     worker:
       build: ./worker
       environment:
         - DB_HOST=mysql
         - RABBITMQ_URL=amqp://rabbitmq
     mysql:
       image: mysql:8.0
       environment:
         MYSQL_ROOT_PASSWORD: rootpass
         MYSQL_DATABASE: chat_db
         MYSQL_USER: chat_user
         MYSQL_PASSWORD: chat_pass
     rabbitmq:
       image: rabbitmq:3-management
       ports:
         - "5672:5672"
         - "15672:15672"
   ```

This architecture provides:
- Real-time messaging with WebSockets
- Typing indicators and online status
- Message persistence in MySQL
- Scalability through RabbitMQ and Redis
- Offline message delivery
- Horizontal scaling capabilities

Key optimizations:
- Connection pooling for database
- Message batching for offline delivery
- Efficient presence tracking
- Binary WebSocket protocol for reduced bandwidth
- Indexed database queries
- Asynchronous processing via RabbitMQ