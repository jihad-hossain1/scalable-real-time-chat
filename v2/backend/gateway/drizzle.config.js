module.exports = {
  schema: "./src/models/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://admin:admin@localhost:5432/mydb",
  },
  verbose: true,
  strict: true,
};
