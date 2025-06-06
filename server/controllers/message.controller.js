const { db } = require("../lib/db");
const { messageTable } = require("../lib/db/schema");
const { eq, and } = require("drizzle-orm");

async function getOneToOneMessage(req, res) {
  const { senderId, receiverId } = req.query;

  try {
    const messages = await db
      .select()
      .from(messageTable)
      .where(
        and(
          eq(messageTable.sender_id, Number(senderId)),
          eq(messageTable.receiver_id, Number(receiverId))
        )
      );

    res.send(messages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).send("Failed to fetch messages");
  }
}

module.exports = {
  getOneToOneMessage,
};
