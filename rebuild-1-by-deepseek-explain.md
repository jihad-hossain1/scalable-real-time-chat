Scalable One-to-One Chat Application Solution
build an one to one chat application which are store message in database, scalable, realtime notification, realtime typing indicator , realtime online show .
technology stack 
fronend - react
backend - nodejs, mysql, rabbitmq
We are going to build a one-to-one chat application with the following features:

- Store messages in a database (MySQL)

- Scalable (using RabbitMQ for message queuing and possibly scaling Node.js instances)

- Real-time notifications (using WebSockets, we'll use Socket.IO for simplicity)

- Real-time typing indicators

- Real-time online status

Technology Stack:

- Frontend: React

- Backend: Node.js (Express)

- Database: MySQL

- Message Queue: RabbitMQ (for decoupling and scalability)

High-Level Design:

1. **Database Schema**:

- Users: id, username, email, password (hashed), online_status, last_seen?

- Messages: id, sender_id, receiver_id, message, created_at, is_delivered, is_read?

- We might also want a table for tracking online status, but we can do it via in-memory storage and update the database periodically? Or we can update the `online_status` in the Users table in real-time via WebSockets.

2. **Real-time Communication**:

- We'll use Socket.IO for real-time bidirectional communication. It will handle:

- Online status updates

- Typing indicators

- Instant message delivery and notifications

- However, for true scalability, we might need to use a pub/sub system (like Redis) to scale Socket.IO across multiple nodes. But the requirement says RabbitMQ, so we can use RabbitMQ for the pub/sub? Actually, RabbitMQ can be used for inter-process communication, but Socket.IO has adapters for Redis. We can use RabbitMQ as a message broker for our application logic (like queuing messages for delivery when offline) and use Redis for Socket.IO scaling? Or we can avoid using Redis and use the RabbitMQ adapter for Socket.IO? There isn't an official one. Alternatively, we can use RabbitMQ for the application and not for Socket.IO scaling, and then scale via a load balancer with sticky sessions?

Given the complexity, let's stick with a single Node.js instance for the WebSocket server for now, and we can scale by having multiple WebSocket servers and using RabbitMQ as a message broker between them? Actually, for Socket.IO we can use the Redis adapter for scaling, but the requirement is RabbitMQ. So we might need to find an alternative.

Alternatively, we can use RabbitMQ to relay messages between different Node.js instances? We can have each instance subscribe to a RabbitMQ exchange and publish messages to it. Then, when a message is intended for a user connected to another instance, that instance will pick it up and deliver via its own Socket.IO.

However, for simplicity in the initial version, we'll use one Node.js server. We can later scale by using RabbitMQ to pass messages between instances and using a load balancer. But note: the requirement is to be scalable.

Let me outline:

- We'll have multiple Node.js instances (for HTTP and WebSockets) behind a load balancer (that supports WebSockets and sticky sessions).

- Each instance will have its own Socket.IO and will connect to a common RabbitMQ.

- We'll create a system where when a message is received by one instance, it will publish to a RabbitMQ exchange with a routing key that includes the recipient's ID. Then, all instances will consume from that exchange and if the recipient is connected to them, they will deliver the message.

But note: we also have to store messages in the database. So when a message is sent, we store it in the database and then publish an event to RabbitMQ for real-time delivery.

Steps for sending a message:

1. Client sends a message via HTTP (or WebSocket) to one of the Node.js instances.

2. The instance stores the message in the database (with status 'sent' but not delivered?).

3. Then, the instance publishes an event to RabbitMQ (exchange: 'message_events') with routing key `user_<recipient_id>` and the message data.

4. All instances (including the sender) are consuming from a queue bound to the exchange with the pattern `user_*`. Each instance will check if the recipient is connected to it (via a local map of user IDs to socket connections). If so, it sends the message via the socket to the recipient.

5. The recipient's instance also updates the message status to 'delivered' in the database? Or we can do that when the recipient's client acknowledges? We can do it when we send the message and then wait for an ack? Or we can update when the message is stored and then rely on the client to send a read receipt? For now, we'll update as delivered when we send it (but that doesn't guarantee the client received it). We can use Socket.IO acknowledgements to update delivery status.

Alternatively, we can use the WebSocket connection for sending messages to avoid the extra HTTP call? It's real-time so we can do:

- Client A sends a message to the server via WebSocket.

- The server (instance) stores the message in the database and then publishes to RabbitMQ for the recipient (Client B). The instance that has Client B will get the message and send it via WebSocket to Client B. Then, that instance can update the message as delivered? Or we can have Client B send an acknowledgement? We'll do:

a) Client A sends message via WebSocket to server.

b) Server stores in DB (with status: 'sent') and publishes to RabbitMQ.

c) The instance that has Client B: it sends the message to Client B and then updates the DB status to 'delivered' (or waits for Client B to acknowledge?).

We'll do:

- When the message is stored, set `status` = 'sent'

- When the message is delivered to the client (via WebSocket and the client acknowledges), then set `status` = 'delivered'

But note: we are using WebSocket and we can use acknowledgements. However, if the client disconnects before acknowledging, we need to handle that. Alternatively, we can mark it as delivered when we send it to the socket and then if the client doesn't get it, we rely on reconnection and resend? This is complex.

For simplicity, we can just store the message and then push it to the recipient. If the recipient is offline, we don't push and then when they come online, we send the messages. We can store the message and then when the user comes online, we fetch the undelivered messages and send them. But then we don't have a real-time delivery status.

Let's break down:

We want:

- Messages to be stored in the DB.

- Real-time delivery if the user is online, otherwise store and deliver when online.

We can:

- On message from sender:

1. Store in DB (with status: 'sent')

2. Check if the recipient is online (we have a way to know). If online, publish to RabbitMQ for immediate delivery. If offline, we do nothing (and later when the user comes online, we will fetch and send).

But then how do we know the recipient is online? We can maintain a presence system.

Presence System:

- We'll have a Redis store? Or we can use the database? But for quick lookups, we want in-memory. Since we are using multiple Node instances, we need a shared storage. We can use Redis, but the requirement is RabbitMQ. Alternatively, we can use RabbitMQ for presence? Not really, we need a shared state. We can use the database but it's slower.

Given the constraints, let's use the database for presence? We update the `online_status` in the Users table on connect and disconnect. But then we have to query the database every time we send a message? That might be heavy.

Alternatively, we can use a dedicated presence service that uses Redis? But that's another component.

Considering the requirement for scalability and the stack, we can use RabbitMQ to broadcast presence updates? Then each instance can maintain a local presence state?

Here's a plan for presence:

- When a user connects, the instance publishes a presence event (user online) to a RabbitMQ exchange (fanout) so that all instances update their local presence map.

- Similarly, on disconnect, publish an offline event.

But then if an instance crashes, we need to recover? We can have each instance periodically broadcast the list of users connected to it? Or we can have a central service?

Given the complexity, and since this is a demo, we can use a single Redis instance for presence? But the requirement is RabbitMQ and MySQL.

Alternatively, we can avoid real-time presence and just update the database when a user connects and disconnects? Then, when sending a message, we check the database for online status? But that's not real-time because the database update might be delayed? And we have to update on every connect and disconnect? We can do:

- On connect: update database to set online_status=true and last_seen=now()

- On disconnect: update to false and update last_seen.

- Also, we can have a heartbeat: every 30 seconds update last_seen? And then if last_seen is more than 30 seconds ago, consider offline? But then we have to run a cron job to update status? Or we can do it on the fly? We can have a function that checks last_seen and online_status?

But then when we send a message, we check: if online, then publish to RabbitMQ for immediate delivery. Otherwise, store and wait until they come online? How do we know when they come online? We can have a system that when a user comes online, we check for undelivered messages and send them?

We can:

- When a user comes online, we update the database and then trigger a process to send undelivered messages (by querying the database for messages where status='sent' and receiver_id=this user).

So:

- On user connect (WebSocket connection established):

- Update database: set online_status=1, last_seen=NOW()

- Query the database for all messages for this user that are not delivered (status='sent') and send them one by one (via WebSocket) and then update the status to 'delivered'? Or wait for client ack? We can update to delivered when we send? But if the client doesn't get it, then we need to resend? We can rely on the WebSocket to be reliable? It's not 100% but for our purpose, we can assume.

So the flow for sending a message:

- Client A sends a message to the server (via WebSocket or HTTP? We'll use WebSocket for real-time).

- The server:

a) Stores the message in the database with status='sent'

b) Checks the database: is Client B online?

- If online: publish an event to RabbitMQ exchange (direct exchange) with routing key `user_<Client_B_id>`. The event contains the message.

- If offline: do nothing (the message will be delivered when Client B comes online).

- The RabbitMQ consumer in each Node instance:

- It is consuming from a queue that is bound to the exchange with the routing key pattern `user_*`. Each instance creates a queue for itself and binds with the pattern? Or we can have a fanout? But we want only the instance that has Client B to get it? We can use a direct exchange and bind with the specific routing key? But how do we route to the right instance?

Alternatively, we can have each instance create a queue and bind with the routing keys for the users that are connected to it? Then, when we publish a message for user_123, it goes to the queue of the instance that has user_123? But how do we know which instance? We don't.

We can instead use a fanout exchange and then each instance gets every message. Then, the instance checks if the recipient (user in the message) is connected locally. If so, it sends the message via the WebSocket and updates the status to 'delivered'.

Steps:

- Each instance, on startup, creates a queue and binds to the fanout exchange for message_events.

- When a message is published (for any user), every instance gets it.

- Each instance checks if the recipient is connected to it (using a local Map: `userSockets` which maps userID to socket object). If yes, then send the message via the socket and update the database status to 'delivered'. Otherwise, ignore.

This way, only the instance that has the recipient will send the message.

But note: if the recipient is not online at all, then no instance will have the user, and the message will be stored and then when the user comes online, we will send via the "on connect" process.

So the steps for sending a message:

- Client A (on instance X) sends a message via WebSocket to instance X.

- Instance X:

- Stores the message in DB (status='sent')

- Checks the database: is Client B online? (by querying the Users table for Client B's online_status)

- If online: publish the message to RabbitMQ fanout exchange (with the message and recipient ID)

- If offline: do nothing (the message will be delivered when Client B comes online).

- All instances (including X) receive the message from RabbitMQ.

- Each instance checks if Client B is connected to it (using a local `userSockets` Map).

- If an instance finds Client B, it sends the message to Client B via WebSocket and then updates the message status to 'delivered' in the database.

But note: we are publishing the message even if the recipient is offline? We are publishing only when the sender's instance thinks the recipient is online. However, there is a race condition: the recipient might have just gone offline. Then, the message will be published and no instance will send it? Then we have to handle that?

Alternatively, we can skip the online check and always publish? Then, if the recipient is online, the instance that has the recipient will deliver. If not, then we don't deliver? Then we have to have a way to deliver when the user comes online? But we already have the message stored with status='sent'. Then, when the user comes online, we will query and send. But note: we are publishing the message to RabbitMQ and if the user is offline, we are storing the message and then also publishing? Then the message will be stored and also published? And if the user is offline, the published message will be ignored? Then we have two copies?

We can change:

- When a message is sent, we store it and publish to RabbitMQ without checking online status? Then, if the user is online, the instance that has the user will deliver and update status to delivered. If the user is offline, then the message remains with status 'sent'. Then, when the user comes online, we will query for all 'sent' messages and deliver? But then we might deliver twice? Because when the user comes online, we deliver the old messages, and then if the published message is still in the queue?

We need to think about RabbitMQ message persistence? We can set the message to be persistent? But if there is no online user, the message will be queued? But we are using fanout and every instance has its own queue? Then if the instance that is supposed to deliver is down, the message might be lost?

Alternatively, we can use a single queue for all instances? But then only one instance will get the message? How do we ensure that the instance that has the recipient gets the message? We cannot.

Given the complexity, and for the sake of time, we will implement the following:

- We will have a single WebSocket server instance (for now) and then we can scale by having multiple and using RabbitMQ as a pub/sub for messages between instances? But we'll do that in the next step.

For the first version, we do:

- One Node.js server for WebSockets and HTTP.

- We maintain a map of online users in memory (userId -> socket).

- When a message is sent:

- Store in DB (status='sent')

- If the recipient is in the online map, send the message via WebSocket and update status to 'delivered' (without waiting for ack for simplicity).

- If not, leave it as 'sent'. Then, when the recipient comes online, we will send all 'sent' messages and update to 'delivered'.

Then, we can later scale by:

- Having multiple instances and using RabbitMQ to broadcast messages between them? We can have each instance, when it receives a message, it publishes to RabbitMQ (fanout) and then every instance will try to deliver to the recipient if they are connected locally? And if not, then the message remains in the DB as 'sent'. Then, when a user connects, the instance that the user connects to will query the DB for undelivered messages and send them?

But then we have to store the message in the DB and also publish? And then if the recipient is connected to another instance, that instance will deliver? And update the DB? But what if two instances try to update? We can have the instance that delivers update the status?

We'll design for multiple instances:

- Each instance has a local map of connected users (userId to socket).

- When a user connects to an instance, that instance updates the database: set online_status=1 and then it also publishes a "presence" event to RabbitMQ (fanout) so that all instances know that the user is online? Actually, we don't need to broadcast presence? We can rely on the database for online status? But we want to avoid querying the database for every message.

Instead, we can:

- When a message is sent by Client A to instance X:

- Instance X stores the message in DB (status='sent').

- Then, it publishes to RabbitMQ (fanout exchange) the message (with recipient ID and message ID).

- Every instance (including X) receives the message.

- Each instance checks its local map: if the recipient is connected to it, it sends the message via WebSocket and updates the DB (status='delivered').

- If the recipient is not connected to any instance at that moment, then the message remains as 'sent' until the recipient comes online.

- When a user (Client B) connects to instance Y:

- Instance Y updates the database: set online_status=1.

- Then, it queries the database for all messages for Client B that are 'sent' and sends them (via WebSocket) and updates the status to 'delivered' for each.

But note: when the user connects, we update the online status and then we send the undelivered messages. However, during the time between the user coming online and the query, new messages might arrive? We can handle that by:

- After we send the undelivered messages, we start listening for new messages via RabbitMQ.

But we are already listening? The RabbitMQ messages are for real-time delivery? So if a message is published after the user comes online, it will be delivered via RabbitMQ? And we don't need to worry about duplicates? Because the query for undelivered messages gets the ones before the online update? Then the new ones will come via RabbitMQ.

However, there is a race condition: if a message is stored and published after the user comes online but before we finish sending the old messages? Then we might send the same message twice? We can avoid that by having the message delivery in the RabbitMQ handler and the "on connect" send both update the status to delivered? Then, if we send the same message twice, the second update will fail? Or we can use a unique message ID? We can have the RabbitMQ message include the message ID? Then, when we send the message from the "on connect" query, we update to delivered. Then, when the RabbitMQ message comes, we check the status: if already delivered, skip?

We can do:

- When processing a RabbitMQ message for a message (with ID=mid), check the database: if the status is already delivered, skip. Otherwise, try to deliver and update to delivered.

Similarly, when we send from the "on connect" query, we update to delivered. Then, if a RabbitMQ message comes for the same message, we skip.

This design can work.

Now, let's break down the implementation:

Backend:

- Express server for HTTP routes (for user registration, login, getting messages, etc.)

- Socket.IO for real-time

- RabbitMQ for pub/sub between instances

We'll create:

- A RabbitMQ connection and channel for publishing and consuming.

- A fanout exchange for messages: 'message_exchange'

Steps:

1. On server start:

- Connect to RabbitMQ and create a fanout exchange (if not exists).

- Create a queue for this instance (with a unique name, e.g., server_instance_<uuid>).

- Bind the queue to the fanout exchange.

2. When a user connects via WebSocket:

- Store the user's socket in a Map: `const userSockets = new Map();` (key: userId, value: socket)

- Update the database: `UPDATE Users SET online_status=1 WHERE id=?`

- Query the database for undelivered messages for this user (status='sent') and send each one via the socket. Then, update each message to status='delivered'.

- Also, publish a presence event? Not necessary for now? We are using the database for online status? But we also have the local map for quick delivery?

3. When a user disconnects:

- Remove from `userSockets`

- Update database: `UPDATE Users SET online_status=0 WHERE id=?`

4. When a message is received via WebSocket from a client (say, user A to user B):

- Store the message in the Messages table (status='sent')

- Publish to RabbitMQ (to the fanout exchange) a message that includes:

- messageId (the one we just inserted)

- senderId: A

- recipientId: B

- content: the message

- We don't check online status? We always publish? Then, if user B is online, the instance that has B will deliver. If not, the message remains as 'sent' until B comes online.

5. When the server instance receives a message from RabbitMQ:

- Parse the message: it has recipientId and messageId, etc.

- Check the local `userSockets` map: if the recipient is connected to this instance, then:

- Get the socket and send the message.

- Update the message status to 'delivered' in the database.

- If not, do nothing.

For the frontend:

- We'll use React and Socket.IO client.

Now, let's outline the code structure:

Backend:

- app.js (or server.js): main entry

- db.js: database connection and queries

- rabbitmq.js: setup RabbitMQ connection and channel, and the consumer

- socket.js: setup Socket.IO and handle events

We'll create:

- User registration and login (JWT authentication for WebSocket? or session? We'll use JWT)

Steps for authentication:

- User logs in via HTTP and gets a JWT.

- When connecting via WebSocket, the client sends the JWT. The server verifies and then associates the socket with the user.

Let's start coding the backend:

We'll need the following packages:

- express

- socket.io

- amqplib (for RabbitMQ)

- mysql2

- jsonwebtoken

- body-parser

- cors

We'll create the following routes (HTTP):

POST /register: register a new user

POST /login: login and get JWT

We'll create the following Socket.IO events:

- 'connect': when a client connects (with token)

- 'disconnect': when disconnects

- 'message': when a client sends a message

- 'typing': when a client is typing (we'll broadcast to the recipient)

- 'stop_typing': when a client stops typing

For typing indicators:

- When a user (A) is typing to user (B), we send an event 'typing' to the server.

- The server then sends an event 'typing' to user B (if online) via the socket.

We can do this without RabbitMQ? Because it's ephemeral. We can:

- Server receives 'typing' from A (for B)

- Check if B is online (in the local `userSockets`). If yes, send the event to B's socket.

But if A and B are on different instances? Then we need to use RabbitMQ to broadcast the typing event?

We can do:

- When server receives 'typing' from A, it publishes to RabbitMQ (a different exchange for typing events) with routing key for B.

- Then, the instance that has B will get it and send to B.

We'll create a fanout exchange for typing events? But we don't want every instance to get it? We want only the instance that has B. We can use the same pattern as messages?

Alternatively, we can use the same exchange and add a type field? And then the consumer can decide what to do?

Let's have two exchanges:

- message_exchange: for chat messages

- typing_exchange: for typing events

For typing events:

- When a user A starts typing to B, the server (instance that A is connected to) publishes to the typing_exchange (fanout) an event: { from: A, to: B, type: 'start' }

- Each instance receives the event and checks if B is locally connected. If yes, it emits a 'typing' event to B's socket.

Similarly for 'stop_typing'.

For online status:

- We are storing in the database. But we also want to update the frontend in real-time?

- When a user comes online, we want to notify his/her contacts?

- We can do:

- When a user comes online (on connect), we update the database and then we can publish an event to a presence_exchange (fanout) with the user ID and status: online.

- Each instance will receive and then if they have any socket for a user that is a contact of the online user, they notify that contact.

But then we have to maintain a list of contacts? We don't have a contact list in the database? We only have the messages. We can have:

- A contacts table? Or we can derive from messages: the users that have chatted?

For simplicity, we'll just show online status for any user that you have chatted with? Or we can have a separate contact list? Let's skip contact list and just show online status for the user you are chatting with?

So in the chat screen, when you are in a conversation with user B, you see if user B is online.

How:

- When you open the chat with user B, you subscribe to presence events for user B?

We can do:

- The frontend, when in a conversation with B, sends an event 'subscribe_presence' for user B.

- The server then stores that this socket is interested in B's presence.

- When B comes online, the server (any instance) publishes to presence_exchange (fanout) an event: { userId: B, status: 'online' }

- Each instance then checks if any socket is subscribed to B's presence? And then sends the event to those sockets.

But this is complex.

Alternatively, we can just query the online status of user B when the chat is opened? And then also, when user B comes online/offline, we notify via WebSocket?

We can do:

- When a user B comes online:

- The instance that B is connected to will notify all sockets that are interested in B's presence? How does it know? We can maintain in each instance a map: `presenceSubscriptions` which is a Map of userId (B) to a set of sockets (the sockets that are interested in B).

- When a user A wants to subscribe to B's presence:

- The server (instance of A) adds A's socket to the set for B in the local `presenceSubscriptions`.

- Then, the server also sends the current online status of B (from the database) to A.

- When B comes online (on any instance), that instance publishes to a presence_exchange (fanout) an event: { userId: B, status: 'online' }

- Each instance receives the event and then for every socket in the local `presenceSubscriptions` for B, sends the event.

- Similarly for offline.

This requires a lot of state management. Given the time, we might skip presence subscription and just update the online status in the database and then the frontend can poll periodically? Or we can do:

- When in a conversation with B, the frontend polls every 10 seconds for B's online status?

We'll do that for simplicity.

So for now, we'll not implement real-time online status via WebSocket? The requirement says "realtime online show", so we must do real-time?

We can do:

- We'll maintain in each instance a list of sockets that are interested in which users?

But let's do it without RabbitMQ for presence for now? Only for messages and typing.

We can have:

- When a user B comes online, the instance that B is connected to will send a presence event to all sockets that are interested in B? But if the interested socket is on another instance, how? We need to broadcast the presence event to all instances?

We can use the same RabbitMQ exchange for presence events?

Steps:

- When a user B comes online (on instance Y):

- Instance Y publishes to presence_exchange (fanout) an event: { userId: B, status: 'online' }

- Every instance (including Y) receives the event.

- Each instance then checks its local `presenceSubscriptions`: if there are sockets subscribed to B, then send the event to those sockets.

Similarly for offline.

We'll do this.

Summary of Exchanges in RabbitMQ:

- message_exchange (fanout): for chat messages

- typing_exchange (fanout): for typing events

- presence_exchange (fanout): for presence events

Now, let's start coding.

Due to the complexity and time, we'll implement the core features first: messaging, online status, typing indicators.

We'll break down the backend code:

Step 1: Setup Express, Socket.IO, RabbitMQ, MySQL.

Step 2: Implement user registration and login.

Step 3: Implement Socket.IO authentication.

Step 4: Handle user connection and disconnection (update database, and publish presence events).

Step 5: Handle sending a message.

Step 6: Handle RabbitMQ message consumption (for messages) and deliver if recipient is connected locally.

Step 7: Handle typing events.

Step 8: Handle presence events.

Step 9: Implement presence subscriptions.

We'll start with a single instance to keep it manageable.

Let's code step by step.

Note: This is a high-level guide. We'll write the code in a simplified manner.