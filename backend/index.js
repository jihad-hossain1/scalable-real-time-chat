const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const socketHandler = require("./socket");
const { consumeMessages } = require("./queue");

const app = express();
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

app.use("/api/messages", require("./routes/message.route"));
app.use("/api/users", require("./routes/user.route"));
app.use("/api/auth", require("./routes/auth.route"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

socketHandler(io);
consumeMessages();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
