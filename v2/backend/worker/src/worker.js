import dotenv from 'dotenv';
import { testConnection } from './models/db.js';
import { redisService } from './services/redis.js';
import { rabbitMQService } from './services/rabbitmq.js';
import { messageProcessor } from './processors/messageProcessor.js';
import { notificationProcessor } from './processors/notificationProcessor.js';
import { emailProcessor } from './processors/emailProcessor.js';

// Load environment variables
dotenv.config();

class Worker {
  constructor() {
    this.isShuttingDown = false;
    this.activeProcessors = new Map();
    this.healthCheckInterval = null;
    this.statsInterval = null;
    
    // Bind methods to preserve context
    this.handleMessage = this.handleMessage.bind(this);
    this.handleNotification = this.handleNotification.bind(this);
    this.handleEmail = this.handleEmail.bind(this);
    this.gracefulShutdown = this.gracefulShutdown.bind(this);
  }

  async start() {
    try {
      console.log('🚀 Starting Chat Worker...');
      
      // Test database connection
      console.log('📊 Testing database connection...');
      await testConnection();
      console.log('✅ Database connection successful');
      
      // Initialize Redis
      console.log('🔴 Connecting to Redis...');
      await redisService.connect();
      console.log('✅ Redis connection successful');
      
      // Initialize RabbitMQ
      console.log('🐰 Connecting to RabbitMQ...');
      await rabbitMQService.connect();
      console.log('✅ RabbitMQ connection successful');
      
      // Setup message queues and consumers
      await this.setupQueues();
      
      // Setup health checks and monitoring
      this.setupMonitoring();
      
      // Setup graceful shutdown handlers
      this.setupShutdownHandlers();
      
      console.log('🎉 Worker started successfully!');
      console.log('📊 Worker Statistics:');
      console.log('  - Message Processor: Ready');
      console.log('  - Notification Processor: Ready');
      console.log('  - Email Processor: Ready');
      console.log('  - Health Checks: Enabled');
      
    } catch (error) {
      console.error('❌ Failed to start worker:', error);
      process.exit(1);
    }
  }

  async setupQueues() {
    try {
      // Setup message queue consumer
      console.log('📨 Setting up message queue consumer...');
      await rabbitMQService.consume(
        'messages',
        this.handleMessage,
        {
          prefetch: 10, // Process up to 10 messages concurrently
          retryAttempts: 3,
          retryDelay: 5000 // 5 seconds
        }
      );
      
      // Setup notification queue consumer
      console.log('🔔 Setting up notification queue consumer...');
      await rabbitMQService.consume(
        'notifications',
        this.handleNotification,
        {
          prefetch: 20, // Notifications can be processed faster
          retryAttempts: 3,
          retryDelay: 3000 // 3 seconds
        }
      );
      
      // Setup email queue consumer
      console.log('📧 Setting up email queue consumer...');
      await rabbitMQService.consume(
        'email',
        this.handleEmail,
        {
          prefetch: 5, // Email sending is slower, limit concurrency
          retryAttempts: 5,
          retryDelay: 10000 // 10 seconds
        }
      );
      
      console.log('✅ All queue consumers setup successfully');
    } catch (error) {
      console.error('❌ Error setting up queues:', error);
      throw error;
    }
  }

  async handleMessage(messageData, rabbitMsg) {
    const processorId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.activeProcessors.set(processorId, {
        type: 'message',
        startTime: new Date(),
        data: messageData
      });
      
      console.log(`📨 Processing message: ${processorId}`);
      await messageProcessor.processMessage(messageData, rabbitMsg);
      console.log(`✅ Message processed successfully: ${processorId}`);
      
    } catch (error) {
      console.error(`❌ Error processing message ${processorId}:`, error);
      throw error;
    } finally {
      this.activeProcessors.delete(processorId);
    }
  }

  async handleNotification(notificationData, rabbitMsg) {
    const processorId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.activeProcessors.set(processorId, {
        type: 'notification',
        startTime: new Date(),
        data: notificationData
      });
      
      console.log(`🔔 Processing notification: ${processorId}`);
      await notificationProcessor.processNotification(notificationData, rabbitMsg);
      console.log(`✅ Notification processed successfully: ${processorId}`);
      
    } catch (error) {
      console.error(`❌ Error processing notification ${processorId}:`, error);
      throw error;
    } finally {
      this.activeProcessors.delete(processorId);
    }
  }

  async handleEmail(emailData, rabbitMsg) {
    const processorId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.activeProcessors.set(processorId, {
        type: 'email',
        startTime: new Date(),
        data: emailData
      });
      
      console.log(`📧 Processing email: ${processorId}`);
      await emailProcessor.processEmail(emailData, rabbitMsg);
      console.log(`✅ Email processed successfully: ${processorId}`);
      
    } catch (error) {
      console.error(`❌ Error processing email ${processorId}:`, error);
      throw error;
    } finally {
      this.activeProcessors.delete(processorId);
    }
  }

  setupMonitoring() {
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 30000);
    
    // Stats logging every 5 minutes
    this.statsInterval = setInterval(() => {
      this.logStats();
    }, 300000);
    
    console.log('📊 Monitoring setup complete');
  }

  async performHealthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {},
      activeProcessors: this.activeProcessors.size,
      uptime: process.uptime()
    };
    
    try {
      // Check database
      await testConnection();
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }
    
    try {
      // Check Redis
      const redisHealth = await redisService.healthCheck();
      health.services.redis = redisHealth.status;
      if (redisHealth.status !== 'healthy') {
        health.status = 'degraded';
      }
    } catch (error) {
      health.services.redis = 'unhealthy';
      health.status = 'degraded';
    }
    
    try {
      // Check RabbitMQ
      const rabbitHealth = await rabbitMQService.healthCheck();
      health.services.rabbitmq = rabbitHealth.status;
      if (rabbitHealth.status !== 'healthy') {
        health.status = 'degraded';
      }
    } catch (error) {
      health.services.rabbitmq = 'unhealthy';
      health.status = 'degraded';
    }
    
    // Store health status in Redis
    try {
      await redisService.client.setEx(
        'worker:health',
        60, // 1 minute TTL
        JSON.stringify(health)
      );
    } catch (error) {
      console.error('Failed to store health status:', error);
    }
    
    if (health.status !== 'healthy') {
      console.warn('⚠️ Worker health check:', health);
    }
  }

  logStats() {
    console.log('📊 Worker Statistics:');
    console.log('  Active Processors:', this.activeProcessors.size);
    console.log('  Uptime:', Math.floor(process.uptime()), 'seconds');
    console.log('  Memory Usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
    
    // Log processor stats
    const messageStats = messageProcessor.getStats();
    console.log('  Message Processor:', {
      processed: messageStats.processed,
      failed: messageStats.failed,
      rate: Math.round(messageStats.rate * 100) / 100 + ' msg/min'
    });
    
    const notificationStats = notificationProcessor.getStats();
    console.log('  Notification Processor:', {
      processed: notificationStats.processed,
      failed: notificationStats.failed,
      rate: Math.round(notificationStats.rate * 100) / 100 + ' notif/min'
    });
    
    const emailStats = emailProcessor.getStats();
    console.log('  Email Processor:', {
      processed: emailStats.processed,
      sent: emailStats.sent,
      failed: emailStats.failed,
      successRate: emailStats.successRate
    });
  }

  setupShutdownHandlers() {
    // Handle graceful shutdown
    process.on('SIGTERM', this.gracefulShutdown);
    process.on('SIGINT', this.gracefulShutdown);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      this.gracefulShutdown();
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });
    
    console.log('🛡️ Shutdown handlers setup complete');
  }

  async gracefulShutdown() {
    if (this.isShuttingDown) {
      console.log('⏳ Shutdown already in progress...');
      return;
    }
    
    this.isShuttingDown = true;
    console.log('🛑 Initiating graceful shutdown...');
    
    try {
      // Clear intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
      }
      
      // Wait for active processors to complete (with timeout)
      console.log(`⏳ Waiting for ${this.activeProcessors.size} active processors to complete...`);
      const shutdownTimeout = setTimeout(() => {
        console.log('⚠️ Shutdown timeout reached, forcing exit...');
        process.exit(1);
      }, 30000); // 30 seconds timeout
      
      // Wait for processors to finish
      while (this.activeProcessors.size > 0) {
        console.log(`⏳ ${this.activeProcessors.size} processors still active...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      clearTimeout(shutdownTimeout);
      console.log('✅ All processors completed');
      
      // Close RabbitMQ connection
      console.log('🐰 Closing RabbitMQ connection...');
      await rabbitMQService.disconnect();
      console.log('✅ RabbitMQ disconnected');
      
      // Close Redis connection
      console.log('🔴 Closing Redis connection...');
      await redisService.disconnect();
      console.log('✅ Redis disconnected');
      
      console.log('🎉 Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  // Get current worker status
  getStatus() {
    return {
      isShuttingDown: this.isShuttingDown,
      activeProcessors: this.activeProcessors.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      processors: {
        message: messageProcessor.getStats(),
        notification: notificationProcessor.getStats(),
        email: emailProcessor.getStats()
      }
    };
  }
}

// Create and start worker instance
const worker = new Worker();

// Start the worker
worker.start().catch(error => {
  console.error('❌ Failed to start worker:', error);
  process.exit(1);
});

// Export for testing
export { worker };