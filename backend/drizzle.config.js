const dotenv = require("dotenv");
dotenv.config();
const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.js",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  },
});
