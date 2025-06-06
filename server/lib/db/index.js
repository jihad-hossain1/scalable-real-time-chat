const dotenv = require("dotenv");
dotenv.config();

const mysql = require("mysql2");
const { drizzle } = require("drizzle-orm/mysql2");

// Create a MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Pass the connection to Drizzle
const db = drizzle(connection);

module.exports = { db };
