Got it! I’ll provide you a **minimal but working skeleton** code for your full app structure with the core features:

---

# Backend

---

### 1. `/backend/gateway/index.js` (WebSocket Gateway with Socket.IO)

```js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const redis = require("redis");

const redisClient = redis.createClient();
redisClient.connect();

const JWT_SECRET = "your_jwt_secret";
const RABBITMQ_URL = "amqp://localhost";

async function start() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  // RabbitMQ connection & channel
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertQueue("chat.message.queue", { durable: true });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${userId}`);

    // Set user online in Redis with expiry
    redisClient.set(`user:${userId}:online`, "true", { EX: 60 });

    // Broadcast user online status to others
    socket.broadcast.emit("user_online", { userId });

    // Handle incoming chat message
    socket.on("send_message", async (data) => {
      const messagePayload = {
        senderId: userId,
        receiverId: data.receiverId,
        content: data.content,
        timestamp: Date.now(),
      };
      // Publish to RabbitMQ for worker processing
      channel.sendToQueue(
        "chat.message.queue",
        Buffer.from(JSON.stringify(messagePayload)),
        { persistent: true }
      );

      // Emit to receiver if connected
      const receiverSocket = [...io.sockets.sockets.values()].find(
        (s) => s.user.id === data.receiverId
      );
      if (receiverSocket) {
        receiverSocket.emit("receive_message", messagePayload);
      }
    });

    // Typing indicator
    socket.on("typing", (data) => {
      const receiverSocket = [...io.sockets.sockets.values()].find(
        (s) => s.user.id === data.receiverId
      );
      if (receiverSocket) {
        receiverSocket.emit("typing", { senderId: userId });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
      redisClient.del(`user:${userId}:online`);
      socket.broadcast.emit("user_offline", { userId });
    });
  });

  const PORT = 3001;
  server.listen(PORT, () => {
    console.log(`WebSocket Gateway listening on port ${PORT}`);
  });
}

start().catch(console.error);
```

---

### 2. `/backend/worker/messageProcessor.js` (Message persistence worker)

```js
const amqp = require("amqplib");
const { Sequelize, DataTypes } = require("sequelize");

const RABBITMQ_URL = "amqp://localhost";

const sequelize = new Sequelize("chatdb", "root", "password", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

// Define message model
const Message = sequelize.define("Message", {
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  receiverId: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, allowNull: false },
});

async function start() {
  await sequelize.sync();
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  await channel.assertQueue("chat.message.queue", { durable: true });
  channel.consume(
    "chat.message.queue",
    async (msg) => {
      if (msg !== null) {
        const messagePayload = JSON.parse(msg.content.toString());
        console.log("Received message:", messagePayload);

        await Message.create({
          senderId: messagePayload.senderId,
          receiverId: messagePayload.receiverId,
          content: messagePayload.content,
          timestamp: new Date(messagePayload.timestamp),
        });

        channel.ack(msg);
      }
    },
    { noAck: false }
  );

  console.log("Message Processor Worker started");
}

start().catch(console.error);
```

---

### 3. `/backend/models/index.js` (MySQL models export)

```js
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("chatdb", "root", "password", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

const User = sequelize.define("User", {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
});

const Message = sequelize.define("Message", {
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  receiverId: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, allowNull: false },
});

module.exports = { sequelize, User, Message };
```

---

### 4. `/backend/utils/rabbitmq.js` (RabbitMQ helper example)

```js
const amqp = require("amqplib");

async function connectRabbitMQ() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  return { connection, channel };
}

module.exports = { connectRabbitMQ };
```

---

# Frontend

---

### 1. `/frontend/hooks/useSocket.js`

```jsx
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function useSocket(token) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const s = io("http://localhost:3001", {
      auth: { token },
    });
    socketRef.current = s;
    setSocket(s);

    s.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on("typing", ({ senderId }) => {
      setTypingUsers((prev) => new Set(prev.add(senderId)));
      setTimeout(() => {
        setTypingUsers((prev) => {
          prev.delete(senderId);
          return new Set(prev);
        });
      }, 3000);
    });

    return () => {
      s.disconnect();
    };
  }, [token]);

  return { socket, messages, typingUsers };
}
```

---

### 2. `/frontend/store/chatStore.js` (Zustand example)

```jsx
import create from "zustand";

const useChatStore = create((set) => ({
  messages: [],
  typingUsers: new Set(),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setTypingUsers: (typingUsers) => set({ typingUsers }),
}));

export default useChatStore;
```

---

### 3. `/frontend/components/ChatBox.jsx`

```jsx
import React, { useState } from "react";

export default function ChatBox({ socket, receiverId }) {
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit("send_message", { receiverId, content: input });
    setInput("");
  };

  const onTyping = () => {
    socket.emit("typing", { receiverId });
  };

  return (
    <div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onTyping}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

---

### 4. `/frontend/components/MessageList.jsx`

```jsx
import React from "react";

export default function MessageList({ messages, currentUserId }) {
  return (
    <ul>
      {messages.map((msg, i) => (
        <li
          key={i}
          style={{
            textAlign: msg.senderId === currentUserId ? "right" : "left",
            padding: "5px",
          }}
        >
          <b>{msg.senderId === currentUserId ? "You" : "Them"}:</b> {msg.content}
        </li>
      ))}
    </ul>
  );
}
```

---

### 5. `/frontend/components/TypingIndicator.jsx`

```jsx
import React from "react";

export default function TypingIndicator({ typingUsers, currentUserId }) {
  if (!typingUsers.size) return null;

  const names = Array.from(typingUsers)
    .filter((id) => id !== currentUserId)
    .join(", ");

  if (!names) return null;

  return <div>{names} is typing...</div>;
}
```

---

### Usage example in React App component:

```jsx
import React from "react";
import useSocket from "./hooks/useSocket";
import ChatBox from "./components/ChatBox";
import MessageList from "./components/MessageList";
import TypingIndicator from "./components/TypingIndicator";

export default function App() {
  const token = "your-jwt-token";
  const currentUserId = 1; // from auth state
  const receiverId = 2; // chat partner

  const { socket, messages, typingUsers } = useSocket(token);

  return (
    <div>
      <MessageList messages={messages} currentUserId={currentUserId} />
      <TypingIndicator typingUsers={typingUsers} currentUserId={currentUserId} />
      {socket && <ChatBox socket={socket} receiverId={receiverId} />}
    </div>
  );
}
```

---

