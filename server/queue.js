const amqp = require("amqplib");
const db = require("./db") ;

let channel = null;

async function connectRabbitMQ(){
  const conn = await amqp.connect("amqp://localhost");
  channel = await conn.createChannel();
  await channel.assertQueue("chat_messages");
}



async function publishMessage(message){
  if (!channel) await connectRabbitMQ();
  channel.sendToQueue("chat_messages", Buffer.from(JSON.stringify(message)));
}

async function consumeMessages(){
  if (!channel) await connectRabbitMQ();
  channel.consume("chat_messages", async (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString());
      await db.query(
        "INSERT INTO messages (sender_id, receiver_id, group_id, content) VALUES (?, ?, ?, ?)",
        [
          data.sender_id,
          data.receiver_id || null,
          data.group_id || null,
          data.content,
        ]
      );
      channel.ack(msg);
    }
  });
}

module.exports = { publishMessage, consumeMessages };
