Build a full-stack, scalable, real-time chat application with the following features:

🧩 Features:

- One-to-one chat with delivery & seen indicators
- Group creation and group chat
- Real-time typing indicators and online/offline presence
- Notification system (in-app and push)
- JWT authentication

🔧 Tech Stack:

- Backend: Node.js (Express), WebSocket (Socket.IO), Redis (Pub/Sub), RabbitMQ (message queue), PostgreSQL (DB), Drizzle ORM
- Frontend: React vite, socket.io-client, TailwindCSS
- DevOps: Docker, Docker Compose

🧱 Architecture:

- WebSocket Gateway server for handling connections and message routing
- Worker process consuming messages from RabbitMQ and saving to DB
- Redis to manage presence, pub/sub for scale
- Postgres for message storage
- Frontend with a chat UI using React hooks and context

📦 Folder structure:

- /backend
  - /gateway: WebSocket server
  - /worker: Message processor (from queue)
  - /models: Drizzle ORM models
  - /services: Redis, RabbitMQ, notification logic
  - /controllers: API endpoints (user, auth, group)
- /frontend
  - /components: ChatBox, MessageList, InputBox, GroupList
  - /hooks: useSocket, useAuth, useChat
  - /pages
  - /utils and /contexts

💬 Required:

- Code for gateway WebSocket server
- Redis integration for online user tracking and pub/sub
- RabbitMQ producer in gateway and consumer in worker
- Message DB models and storage logic
- REST API endpoints for auth and group management
- React-based frontend with real-time updates using WebSockets
- Docker Compose setup for dev with Redis, RabbitMQ, DB, backend, and frontend

Start with backend setup first: define models, set up gateway server with WebSocket auth using JWT, integrate Redis, and push incoming messages to RabbitMQ.

Then generate the worker logic to consume messages, store in DB, and emit real-time updates to clients using Redis pub/sub.

Finally, scaffold the frontend with auth, socket connection, and basic chat UI.
