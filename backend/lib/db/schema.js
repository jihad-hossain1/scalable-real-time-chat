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
  chat_id: varchar({ length: 30 }),
  timestamp: timestamp().defaultNow(),
});

const userConversationTable = mysqlTable("user_conversations", {
  id: int().autoincrement().primaryKey(),
  user_id: int().notNull(),
  receiver_id: int().notNull(),
  conversation_id: varchar({ length: 30 }),
  timestamp: timestamp().defaultNow(),
});

module.exports = {
  userTable,
  messageTable,
  userConversationTable,
};
