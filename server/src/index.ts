
import express from 'express';
import http from 'http';
import socketIo from 'socket.io';
import cors from 'cors';
import socketHandler from './socket';
import db from './db';
import { consumeMessages } from './queue';


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' },
});

socketHandler(io);
consumeMessages();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Folder structure:
// /server
//   - index.js
//   - socket.js
//   - db.js
//   - queue.js
//   - routes/
// /client
//   - React app (simplified)

// =======================
// ==== SERVER SIDE =====
// =======================

// /server/index.js



// /server/db.js
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'chatapp'
});

module.exports = db;

// /server/queue.js
const amqp = require('amqplib');
const db = require('./db');

let channel;

async function connectRabbitMQ() {
  const conn = await amqp.connect('amqp://localhost');
  channel = await conn.createChannel();
  await channel.assertQueue('chat_messages');
}

async function publishMessage(message) {
  if (!channel) await connectRabbitMQ();
  channel.sendToQueue('chat_messages', Buffer.from(JSON.stringify(message)));
}

async function consumeMessages() {
  if (!channel) await connectRabbitMQ();
  channel.consume('chat_messages', async (msg) => {
    const data = JSON.parse(msg.content.toString());
    await db.query('INSERT INTO messages (sender_id, receiver_id, group_id, content) VALUES (?, ?, ?, ?)', [
      data.sender_id, data.receiver_id || null, data.group_id || null, data.content
    ]);
    channel.ack(msg);
  });
}

module.exports = { publishMessage, consumeMessages };

// /server/socket.js
const { publishMessage } = require('./queue');

const users = {}; // userId: socket.id

function socketHandler(io) {
  io.on('connection', (socket) => {
    socket.on('register', (userId) => {
      users[userId] = socket.id;
      io.emit('presence', Object.keys(users));
    });

    socket.on('private_message', async (msg) => {
      publishMessage(msg);
      const receiverSocket = users[msg.receiver_id];
      if (receiverSocket) io.to(receiverSocket).emit('private_message', msg);
    });

    socket.on('group_message', async (msg) => {
      publishMessage(msg);
      io.emit(`group_${msg.group_id}`, msg);
    });

    socket.on('disconnect', () => {
      for (const [uid, sid] of Object.entries(users)) {
        if (sid === socket.id) delete users[uid];
      }
      io.emit('presence', Object.keys(users));
    });
  });
}

module.exports = socketHandler;