import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.queues = {
      messages: 'messages_queue',
      notifications: 'notifications_queue',
      email: 'email_queue'
    };
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      
      this.connection = await amqp.connect(rabbitmqUrl, {
        heartbeat: 60,
        reconnect: true,
        reconnectBackoffStrategy: 'linear',
        reconnectBackoffTime: 1000
      });

      this.channel = await this.connection.createChannel();
      
      // Set prefetch to process one message at a time
      await this.channel.prefetch(1);

      // Declare queues
      await this.declareQueues();

      // Handle connection events
      this.connection.on('error', (err) => {
        console.error('❌ Worker RabbitMQ connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        console.log('🔌 Worker RabbitMQ connection closed');
        this.isConnected = false;
      });

      this.channel.on('error', (err) => {
        console.error('❌ Worker RabbitMQ channel error:', err);
      });

      this.isConnected = true;
      console.log('✅ Worker RabbitMQ connected successfully');
    } catch (error) {
      console.error('❌ Worker RabbitMQ connection failed:', error);
      throw error;
    }
  }

  async declareQueues() {
    try {
      // Declare all queues as durable
      for (const queueName of Object.values(this.queues)) {
        await this.channel.assertQueue(queueName, {
          durable: true,
          arguments: {
            'x-message-ttl': 86400000, // 24 hours TTL
            'x-max-length': 10000 // Max 10k messages
          }
        });
      }
      
      console.log('✅ Worker RabbitMQ queues declared');
    } catch (error) {
      console.error('❌ Error declaring queues:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log('✅ Worker RabbitMQ disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from RabbitMQ:', error);
    }
  }

  // Consume messages from a queue
  async consumeQueue(queueName, messageHandler, options = {}) {
    try {
      if (!this.isConnected) {
        throw new Error('RabbitMQ not connected');
      }

      const defaultOptions = {
        noAck: false, // Require manual acknowledgment
        exclusive: false,
        priority: 0
      };

      const consumerOptions = { ...defaultOptions, ...options };

      await this.channel.consume(queueName, async (msg) => {
        if (msg === null) {
          console.log('Consumer cancelled');
          return;
        }

        try {
          const content = JSON.parse(msg.content.toString());
          const messageId = msg.properties.messageId || uuidv4();
          
          console.log(`📨 Processing message from ${queueName}:`, messageId);
          
          // Call the message handler
          await messageHandler(content, msg);
          
          // Acknowledge the message
          this.channel.ack(msg);
          
          console.log(`✅ Message processed successfully:`, messageId);
        } catch (error) {
          console.error(`❌ Error processing message from ${queueName}:`, error);
          
          // Check if message should be retried
          const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
          const maxRetries = 3;
          
          if (retryCount <= maxRetries) {
            console.log(`🔄 Retrying message (attempt ${retryCount}/${maxRetries})`);
            
            // Republish with retry count
            await this.channel.publish('', queueName, msg.content, {
              ...msg.properties,
              headers: {
                ...msg.properties.headers,
                'x-retry-count': retryCount
              },
              expiration: 60000 * retryCount // Exponential backoff
            });
          } else {
            console.error(`💀 Message failed after ${maxRetries} retries, sending to DLQ`);
            // In production, you might want to send to a dead letter queue
          }
          
          // Acknowledge the original message to remove it from queue
          this.channel.ack(msg);
        }
      }, consumerOptions);
      
      console.log(`🎯 Started consuming from queue: ${queueName}`);
    } catch (error) {
      console.error(`❌ Error setting up consumer for ${queueName}:`, error);
      throw error;
    }
  }

  // Start consuming messages queue
  async startMessageConsumer(messageHandler) {
    await this.consumeQueue(this.queues.messages, messageHandler);
  }

  // Start consuming notifications queue
  async startNotificationConsumer(notificationHandler) {
    await this.consumeQueue(this.queues.notifications, notificationHandler);
  }

  // Start consuming email queue
  async startEmailConsumer(emailHandler) {
    await this.consumeQueue(this.queues.email, emailHandler);
  }

  // Publish a message to a queue (for testing or internal use)
  async publishToQueue(queueName, data, options = {}) {
    try {
      if (!this.isConnected) {
        throw new Error('RabbitMQ not connected');
      }

      const messageId = uuidv4();
      const defaultOptions = {
        persistent: true,
        messageId,
        timestamp: Date.now(),
        contentType: 'application/json'
      };

      const publishOptions = { ...defaultOptions, ...options };
      const message = Buffer.from(JSON.stringify(data));

      const result = await this.channel.sendToQueue(queueName, message, publishOptions);
      
      if (result) {
        console.log(`📤 Message published to ${queueName}:`, messageId);
      } else {
        console.warn(`⚠️ Message may not have been queued: ${messageId}`);
      }
      
      return messageId;
    } catch (error) {
      console.error(`❌ Error publishing to ${queueName}:`, error);
      throw error;
    }
  }

  // Get queue information
  async getQueueInfo(queueName) {
    try {
      if (!this.isConnected) {
        throw new Error('RabbitMQ not connected');
      }

      const queueInfo = await this.channel.checkQueue(queueName);
      return {
        queue: queueName,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount
      };
    } catch (error) {
      console.error(`❌ Error getting queue info for ${queueName}:`, error);
      return null;
    }
  }

  // Get all queues information
  async getAllQueuesInfo() {
    const queuesInfo = {};
    
    for (const [key, queueName] of Object.entries(this.queues)) {
      queuesInfo[key] = await this.getQueueInfo(queueName);
    }
    
    return queuesInfo;
  }

  // Purge a queue (remove all messages)
  async purgeQueue(queueName) {
    try {
      if (!this.isConnected) {
        throw new Error('RabbitMQ not connected');
      }

      const result = await this.channel.purgeQueue(queueName);
      console.log(`🧹 Purged ${result.messageCount} messages from ${queueName}`);
      return result.messageCount;
    } catch (error) {
      console.error(`❌ Error purging queue ${queueName}:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isConnected || !this.connection || !this.channel) {
        return false;
      }

      // Try to check a queue to verify connection is working
      await this.channel.checkQueue(this.queues.messages);
      return true;
    } catch (error) {
      console.error('RabbitMQ health check failed:', error);
      return false;
    }
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      connection: !!this.connection,
      channel: !!this.channel,
      queues: this.queues
    };
  }

  // Generate unique ID
  generateId() {
    return uuidv4();
  }

  // Close specific consumer
  async closeConsumer(consumerTag) {
    try {
      if (this.channel && consumerTag) {
        await this.channel.cancel(consumerTag);
        console.log(`🛑 Consumer ${consumerTag} closed`);
      }
    } catch (error) {
      console.error(`❌ Error closing consumer ${consumerTag}:`, error);
    }
  }

  // Setup dead letter queue (for failed messages)
  async setupDeadLetterQueue(originalQueueName) {
    try {
      const dlqName = `${originalQueueName}_dlq`;
      
      await this.channel.assertQueue(dlqName, {
        durable: true,
        arguments: {
          'x-message-ttl': 604800000 // 7 days TTL for DLQ
        }
      });
      
      console.log(`💀 Dead letter queue setup: ${dlqName}`);
      return dlqName;
    } catch (error) {
      console.error('❌ Error setting up dead letter queue:', error);
      throw error;
    }
  }
}

export const rabbitmqService = new RabbitMQService();