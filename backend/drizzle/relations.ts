import { relations } from "drizzle-orm/relations";
import { users, messages } from "./schema";

export const messagesRelations = relations(messages, ({one}) => ({
	user_receiverId: one(users, {
		fields: [messages.receiverId],
		references: [users.id],
		relationName: "messages_receiverId_users_id"
	}),
	user_senderId: one(users, {
		fields: [messages.senderId],
		references: [users.id],
		relationName: "messages_senderId_users_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	messages_receiverId: many(messages, {
		relationName: "messages_receiverId_users_id"
	}),
	messages_senderId: many(messages, {
		relationName: "messages_senderId_users_id"
	}),
}));