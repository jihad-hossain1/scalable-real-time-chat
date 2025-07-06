import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL || "postgresql://admin:admin@localhost:5432/mydb";

// Create the connection
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create the database instance
export const db = drizzle(client, { schema });

// Export schema for use in other modules
export * from "./schema.js";

// Test connection function
export async function testConnection() {
  try {
    await client`SELECT 1`;
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing database connection...");
  await client.end();
  process.exit(0);
});
