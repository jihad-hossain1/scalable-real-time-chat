const amqp = require("amqplib");
const { db } = require("./db");
const { messageTable, userConversationTable } = require("./db/schema");
const { and, eq, or } = require("drizzle-orm");

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
const RABBITMQ_USER = process.env.RABBITMQ_USER || "guest";
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || "guest";

let channel = null;

async function connectRabbitMQ() {
  try {
    // const conn = await amqp.connect("amqp://localhost");
    const conn = await amqp.connect(
      `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}`
    );
    channel = await conn.createChannel();
    await channel.assertQueue("chat_messages");
    console.log("✅ RabbitMQ connected and queue asserted.");
  } catch (error) {
    console.error("❌ RabbitMQ connection error:", error.message);
    channel = null; // ensure channel stays null on failure
  }
}

async function publishMessage(message) {
  try {
    if (!channel) await connectRabbitMQ();

    if (!channel) {
      console.warn("⚠️ Cannot publish: RabbitMQ not connected.");
      return;
    }

    channel.sendToQueue("chat_messages", Buffer.from(JSON.stringify(message)));
  } catch (error) {
    console.error("❌ Error publishing message:", error.message);
  }
}

async function consumeMessages() {
  try {
    if (!channel) await connectRabbitMQ();

    if (!channel) {
      console.warn("⚠️ Cannot consume: RabbitMQ not connected.");
      return;
    }

    await channel.consume("chat_messages", async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        let chatId = "";

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

        if (chatIdExists.length === 0) {
          chatId = Math.random().toString(36).substring(2, 15);

          await db.insert(userConversationTable).values({
            user_id: data.sender_id,
            receiver_id: data.receiver_id,
            conversation_id: chatId,
            timestamp: new Date(),
          });
        } else {
          chatId = chatIdExists[0].conversation_id;
        }

        await db.insert(messageTable).values({
          sender_id: data.sender_id,
          receiver_id: data.receiver_id || null,
          group_id: data.group_id || null,
          content: data.content,
          chat_id: chatId,
          timestamp: new Date(),
        });

        channel.ack(msg);
      } catch (err) {
        console.error("❌ Error processing message:", err.message);
        // Acknowledge anyway to prevent stuck messages
        channel.ack(msg);
      }
    });

    console.log("✅ RabbitMQ consumer started.");
  } catch (error) {
    console.error("❌ Error starting consumer:", error.message);
  }
}

module.exports = { publishMessage, consumeMessages };

// const amqp = require("amqplib");
// const { db } = require("./lib/db");
// const { messageTable, userConversationTable } = require("./lib/db/schema");
// const { and, eq, or } = require("drizzle-orm");
// const { sanitizeText } = require("./utils/sanitizeText");

// let channel = null;

// async function connectRabbitMQ() {
//   const conn = await amqp.connect("amqp://localhost");
//   channel = await conn.createChannel();
//   await channel.assertQueue("chat_messages");
// }

// async function publishMessage(message) {
//   if (!channel) await connectRabbitMQ();
//   channel.sendToQueue("chat_messages", Buffer.from(JSON.stringify(message)));
// }

// async function consumeMessages() {
//   if (!channel) await connectRabbitMQ();
//   channel.consume("chat_messages", async (msg) => {
//     if (msg) {
//       const data = JSON.parse(msg.content.toString());

//       let chatId = "";

//       // check if chat_id exists in db
//       const chatIdExists = await db
//         .select()
//         .from(userConversationTable)
//         .where(
//           or(
//             and(
//               eq(userConversationTable.user_id, data.sender_id),
//               eq(userConversationTable.receiver_id, data.receiver_id)
//             ),
//             and(
//               eq(userConversationTable.user_id, data.receiver_id),
//               eq(userConversationTable.receiver_id, data.sender_id)
//             )
//           )
//         );

//       if (chatIdExists.length == 0) {
//         // if not, create it
//         const newChatId = Math.random().toString(36).substring(2, 15);
//         chatId = newChatId;

//         await db.insert(userConversationTable).values({
//           user_id: data.sender_id,
//           receiver_id: data.receiver_id,
//           conversation_id: newChatId,
//           timestamp: new Date(),
//         });
//       } else {
//         chatId = chatIdExists[0].conversation_id;
//       }

//       // if yes, insert message into db
//       // const cleanContent = sanitizeText(msg.content);

//       await db.insert(messageTable).values({
//         sender_id: data.sender_id,
//         receiver_id: data.receiver_id || null,
//         group_id: data.group_id || null,
//         content: data.content,
//         chat_id: chatId,
//         timestamp: new Date(),
//       });

//       channel.ack(msg);
//     }
//   });
// }

// module.exports = { publishMessage, consumeMessages };
