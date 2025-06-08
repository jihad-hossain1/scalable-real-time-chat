const { db } = require("../lib/db");
const { messageTable, userConversationTable } = require("../lib/db/schema");
const { eq, and, or } = require("drizzle-orm");

async function getOneToOneMessage(req, res) {
  const { senderId, receiverId, page } = req.query;

  const pageNumber = Number(page) || 1;
  const pageSize = 30;
  const offset = (pageNumber - 1) * pageSize;

  try {
    const findChatId = await db
      .select()
      .from(userConversationTable)
      .where(
        or(
          and(
            eq(userConversationTable.user_id, senderId),
            eq(userConversationTable.receiver_id, receiverId)
          ),
          and(
            eq(userConversationTable.user_id, receiverId),
            eq(userConversationTable.receiver_id, senderId)
          )
        )
      );

    if (findChatId.length == 0) {
      return res.status(200).json([]);
    }

    const messages = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.chat_id, findChatId[0].conversation_id));
    // .limit(pageSize)
    // .offset(offset);
    // .orderBy(messageTable.timestamp, "desc");

    res.send(messages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).send("Failed to fetch messages");
  }
}

module.exports = {
  getOneToOneMessage,
};
