import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, int, text, timestamp, varchar, unique, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const messages = mysqlTable("messages", {
	id: int().autoincrement().notNull(),
	senderId: int("sender_id").notNull().references(() => users.id),
	receiverId: int("receiver_id").notNull().references(() => users.id),
	groupId: int("group_id").default('NULL'),
	content: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).default('current_timestamp()'),
	chatId: varchar("chat_id", { length: 30 }).notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
},
(table) => [
	unique("users_email_unique").on(table.email),
]);

export const userConversations = mysqlTable("user_conversations", {
	id: int().notNull(),
	receiverId: int("receiver_id").notNull(),
	userId: int("user_id").notNull(),
	conversationId: varchar("conversation_id", { length: 30 }).default('NULL'),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	timestamp: date({ mode: 'string' }).default('current_timestamp()').notNull(),
});
