import express from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./models/db.js";
import { redisService } from "./services/redis.js";
import { rabbitmqService } from "./services/rabbitmq.js";
import { socketHandler } from "./socket/socketHandler.js";
import { corsMiddleware, errorHandler } from "./middleware/auth.js";

// Import routes
import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/message.js";
import groupRoutes from "./routes/group.js";
import userRoutes from "./routes/user.js";
import callRoutes from "./routes/call.js";
import notificationRoutes from "./routes/notification.js";

// Load environment variables
dotenv.config();

const app = express();
app.use(
  cors({
    origin: "*",
  })
);
const server = createServer(app);
const PORT = process.env.GATEWAY_PORT || 3001;

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    await testConnection();

    // Check Redis connection
    const redisStatus = await redisService.healthCheck();

    // Check RabbitMQ connection
    const rabbitmqStatus = await rabbitmqService.healthCheck();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        redis: redisStatus ? "connected" : "disconnected",
        rabbitmq: rabbitmqStatus ? "connected" : "disconnected",
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connectedUsers: socketHandler.getConnectedUserCount(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/users", userRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    console.log("🚀 Starting Gateway Server...");

    // Test database connection
    console.log("📊 Connecting to database...");
    await testConnection();
    console.log("✅ Database connected successfully");

    // Connect to Redis
    console.log("🔴 Connecting to Redis...");
    await redisService.connect();
    console.log("✅ Redis connected successfully");

    // Connect to RabbitMQ
    console.log("🐰 Connecting to RabbitMQ...");
    await rabbitmqService.connect();
    console.log("✅ RabbitMQ connected successfully");

    // Initialize Socket.IO
    console.log("🔌 Initializing Socket.IO...");
    socketHandler.initialize(server);

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`\n🎉 Gateway Server is running!`);
      console.log(`📍 HTTP Server: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`\n📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔧 Process ID: ${process.pid}`);
      console.log(
        `💾 Memory Usage: ${Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024
        )} MB\n`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close HTTP server
    server.close(() => {
      console.log("✅ HTTP server closed");
    });

    // Close Socket.IO connections
    if (socketHandler.io) {
      socketHandler.io.close(() => {
        console.log("✅ Socket.IO server closed");
      });
    }

    // Disconnect from services
    await Promise.all([
      redisService.disconnect(),
      rabbitmqService.disconnect(),
    ]);

    console.log("✅ All services disconnected");
    console.log("👋 Gateway server shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Start the server
startServer();

export { app, server };
