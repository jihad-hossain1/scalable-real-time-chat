const { publishMessage } = require("./queue");

const users = {}; // userId: socket.id

function socketHandler(io) {
  io.on("connection", (socket) => {
    socket.on("register", (userId) => {
      users[userId] = socket.id;
      io.emit("presence", Object.keys(users));
    });

    socket.on("private_message", async (msg) => {
      publishMessage(msg);
      const receiverSocket = users[msg.receiver_id];
      if (receiverSocket) io.to(receiverSocket).emit("private_message", msg);
    });

    socket.on("typing", ({ senderId, receiverId }) => {
      const receiverSocket = users[receiverId];
      if (receiverSocket) {
        io.to(receiverSocket).emit("typing", senderId);
      }
    });

    socket.on("stop typing", ({ senderId, receiverId }) => {
      const receiverSocket = users[receiverId];
      if (receiverSocket) {
        io.to(receiverSocket).emit("stop typing", senderId);
      }
    });

    socket.on("disconnect", () => {
      for (const [uid, sid] of Object.entries(users)) {
        if (sid === socket.id) delete users[uid];
      }
      io.emit("presence", Object.keys(users));
    });
  });
}

module.exports = socketHandler;
