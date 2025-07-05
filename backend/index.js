const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const socketHandler = require("./lib/socket");
const { consumeMessages } = require("./lib/queue");

const app = express();
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

app.use("/api/v1/messages", require("./routes/message.route"));
app.use("/api/v1/users", require("./routes/user.route"));
app.use("/api/v1/auth", require("./routes/auth.route"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

socketHandler(io);
try {
  consumeMessages();
} catch (error) {
  console.error("<<<---- Rabbitmq server start failed ---->>>", error?.message);
}

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
