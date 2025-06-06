const {
  text,
  timestamp,
  mysqlTable,
  int,
  varchar,
} = require("drizzle-orm/mysql-core");

const userTable = mysqlTable("users", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  password: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

const messageTable = mysqlTable("messages", {
  id: int().autoincrement().primaryKey(),
  sender_id: int()
    .notNull()
    .references(() => userTable.id),
  receiver_id: int()
    .notNull()
    .references(() => userTable.id),
  group_id: int(), // Optional: .references(() => groupTable.id)
  content: text().notNull(),
  timestamp: timestamp().defaultNow(),
});

module.exports = {
  userTable,
  messageTable,
};
