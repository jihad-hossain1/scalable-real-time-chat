import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queues = {
      MESSAGES: "messages_queue",
      NOTIFICATIONS: "notifications_queue",
      EMAIL: "email_queue",
    };
  }

  async connect() {
    try {
      const rabbitmqUrl =
        process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declare queues
      await this.declareQueues();

      console.log("✅ RabbitMQ connected successfully");
    } catch (error) {
      console.error("❌ RabbitMQ connection failed:", error.message);
      throw error;
    }
  }

  async declareQueues() {
    // Declare all queues with durability
    for (const queueName of Object.values(this.queues)) {
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          "x-message-ttl": 86400000, // 24 hours TTL
        },
      });
    }
  }

  // Publish message to queue
  async publishToQueue(queueName, data, options = {}) {
    try {
      const message = Buffer.from(
        JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          id: data.id || this.generateId(),
        })
      );

      const defaultOptions = {
        persistent: true,
        messageId: data.id || this.generateId(),
        timestamp: Date.now(),
      };

      return this.channel.sendToQueue(queueName, message, {
        ...defaultOptions,
        ...options,
      });
    } catch (error) {
      console.error(`Error publishing to queue ${queueName}:`, error);
      throw error;
    }
  }

  // Publish message for processing
  async publishMessage(messageData) {
    return this.publishToQueue(this.queues.MESSAGES, {
      type: "NEW_MESSAGE",
      data: messageData,
    });
  }

  // Publish message status update
  async publishMessageStatus(statusData) {
    return this.publishToQueue(this.queues.MESSAGES, {
      type: "MESSAGE_STATUS",
      data: statusData,
    });
  }

  // Publish notification
  async publishNotification(notificationData) {
    return this.publishToQueue(this.queues.NOTIFICATIONS, {
      type: "NOTIFICATION",
      data: notificationData,
    });
  }

  // Publish notification update (for real-time updates)
  async publishNotificationUpdate(updateData) {
    return this.publishToQueue(this.queues.NOTIFICATIONS, {
      type: "NOTIFICATION_UPDATE",
      data: updateData,
    });
  }

  // Publish email notification
  async publishEmail(emailData) {
    return this.publishToQueue(this.queues.EMAIL, {
      type: "EMAIL",
      data: emailData,
    });
  }

  // Publish typing indicator
  async publishTypingIndicator(typingData) {
    return this.publishToQueue(this.queues.MESSAGES, {
      type: "TYPING_INDICATOR",
      data: typingData,
    });
  }

  // Publish user presence update
  async publishPresenceUpdate(presenceData) {
    return this.publishToQueue(this.queues.MESSAGES, {
      type: "PRESENCE_UPDATE",
      data: presenceData,
    });
  }

  // Publish group event
  async publishGroupEvent(groupEventData) {
    return this.publishToQueue(this.queues.MESSAGES, {
      type: "GROUP_EVENT",
      data: groupEventData,
    });
  }

  // Consumer setup (mainly for worker service)
  async consumeQueue(queueName, callback, options = {}) {
    try {
      const defaultOptions = {
        noAck: false,
        prefetch: 10,
      };

      const finalOptions = { ...defaultOptions, ...options };

      // Set prefetch count
      await this.channel.prefetch(finalOptions.prefetch);

      return this.channel.consume(
        queueName,
        async (msg) => {
          if (msg) {
            try {
              const data = JSON.parse(msg.content.toString());
              await callback(data, msg);

              if (!finalOptions.noAck) {
                this.channel.ack(msg);
              }
            } catch (error) {
              console.error(
                `Error processing message from ${queueName}:`,
                error
              );

              // Reject and requeue the message
              this.channel.nack(msg, false, true);
            }
          }
        },
        { noAck: finalOptions.noAck }
      );
    } catch (error) {
      console.error(`Error setting up consumer for ${queueName}:`, error);
      throw error;
    }
  }

  // Get queue info
  async getQueueInfo(queueName) {
    try {
      return await this.channel.checkQueue(queueName);
    } catch (error) {
      console.error(`Error getting queue info for ${queueName}:`, error);
      return null;
    }
  }

  // Purge queue
  async purgeQueue(queueName) {
    try {
      return await this.channel.purgeQueue(queueName);
    } catch (error) {
      console.error(`Error purging queue ${queueName}:`, error);
      throw error;
    }
  }

  // Generate unique ID
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.connection || !this.channel) {
        return false;
      }

      // Try to declare a temporary queue
      const tempQueue = await this.channel.assertQueue("", { exclusive: true });
      await this.channel.deleteQueue(tempQueue.queue);

      return true;
    } catch (error) {
      console.error("RabbitMQ health check failed:", error);
      return false;
    }
  }

  // Graceful shutdown
  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("RabbitMQ disconnected");
    } catch (error) {
      console.error("Error disconnecting from RabbitMQ:", error);
    }
  }
}

export const rabbitmqService = new RabbitMQService();
