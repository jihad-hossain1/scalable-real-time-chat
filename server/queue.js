const amqp = require("amqplib");
const { db } = require("./lib/db");
const { messageTable, userConversationTable } = require("./lib/db/schema");
const { and, eq, or } = require("drizzle-orm");
const { sanitizeText } = require("./utils/sanitizeText");

let channel = null;

async function connectRabbitMQ() {
  const conn = await amqp.connect("amqp://localhost");
  channel = await conn.createChannel();
  await channel.assertQueue("chat_messages");
}

async function publishMessage(message) {
  if (!channel) await connectRabbitMQ();
  channel.sendToQueue("chat_messages", Buffer.from(JSON.stringify(message)));
}

async function consumeMessages() {
  if (!channel) await connectRabbitMQ();
  channel.consume("chat_messages", async (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString());

      let chatId = "";

      // check if chat_id exists in db
      const chatIdExists = await db
        .select()
        .from(userConversationTable)
        .where(
          or(
            and(
              eq(userConversationTable.user_id, data.sender_id),
              eq(userConversationTable.receiver_id, data.receiver_id)
            ),
            and(
              eq(userConversationTable.user_id, data.receiver_id),
              eq(userConversationTable.receiver_id, data.sender_id)
            )
          )
        );

      if (chatIdExists.length == 0) {
        // if not, create it
        const newChatId = Math.random().toString(36).substring(2, 15);
        chatId = newChatId;

        await db.insert(userConversationTable).values({
          user_id: data.sender_id,
          receiver_id: data.receiver_id,
          conversation_id: newChatId,
          timestamp: new Date(),
        });
      } else {
        chatId = chatIdExists[0].conversation_id;
      }

      // if yes, insert message into db
      const cleanContent = sanitizeText(msg.content);

      await db.insert(messageTable).values({
        sender_id: data.sender_id,
        receiver_id: data.receiver_id || null,
        group_id: data.group_id || null,
        content: cleanContent,
        chat_id: chatId,
        timestamp: new Date(),
      });

      channel.ack(msg);
    }
  });
}

module.exports = { publishMessage, consumeMessages };
