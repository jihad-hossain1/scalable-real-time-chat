import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://chatuser:chatpass@localhost:5432/chatdb';

// Create postgres client with connection pooling
const client = postgres(connectionString, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false // Disable prepared statements for better compatibility
});

// Create Drizzle instance
export const db = drizzle(client, { schema });

// Export all schema tables and relations for easy access
export * from './schema.js';

// Test database connection
export async function testConnection() {
  try {
    await client`SELECT 1`;
    console.log('✅ Worker database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Worker database connection failed:', error.message);
    throw error;
  }
}

// Graceful shutdown
export async function closeConnection() {
  try {
    await client.end();
    console.log('✅ Worker database connection closed');
  } catch (error) {
    console.error('❌ Error closing worker database connection:', error);
    throw error;
  }
}

// Handle process termination
process.on('SIGTERM', closeConnection);
process.on('SIGINT', closeConnection);
process.on('beforeExit', closeConnection);