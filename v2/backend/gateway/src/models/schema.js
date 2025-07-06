import { pgTable, uuid, varchar, text, timestamp, boolean, integer, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  avatar: text('avatar'),
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Groups table
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  avatar: text('avatar'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Group members table (many-to-many relationship)
export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).default('member'), // 'admin', 'member'
  joinedAt: timestamp('joined_at').defaultNow(),
});

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  senderId: uuid('sender_id').references(() => users.id),
  recipientId: uuid('recipient_id').references(() => users.id), // for direct messages
  groupId: uuid('group_id').references(() => groups.id), // for group messages
  messageType: varchar('message_type', { length: 20 }).default('text'), // 'text', 'image', 'file'
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Message status table (for delivery and read receipts)
export const messageStatus = pgTable('message_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  status: varchar('status', { length: 20 }).notNull(), // 'sent', 'delivered', 'read'
  timestamp: timestamp('timestamp').defaultNow(),
});

// Typing indicators table
export const typingIndicators = pgTable('typing_indicators', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  recipientId: uuid('recipient_id').references(() => users.id), // for direct chat
  groupId: uuid('group_id').references(() => groups.id), // for group chat
  isTyping: boolean('is_typing').default(false),
  lastTyping: timestamp('last_typing').defaultNow(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(), // 'message', 'group_invite', etc.
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  data: text('data'), // JSON string for additional data
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Calls table
export const calls = pgTable('calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  callerId: uuid('caller_id').references(() => users.id).notNull(),
  recipientId: uuid('recipient_id').references(() => users.id).notNull(),
  callType: varchar('call_type', { length: 20 }).notNull(), // 'video', 'audio'
  status: varchar('status', { length: 20 }).notNull(), // 'initiated', 'ringing', 'accepted', 'rejected', 'ended', 'missed'
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'), // in seconds
  endedBy: uuid('ended_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: 'sender' }),
  receivedMessages: many(messages, { relationName: 'recipient' }),
  groupMemberships: many(groupMembers),
  createdGroups: many(groups),
  notifications: many(notifications),
  initiatedCalls: many(calls, { relationName: 'caller' }),
  receivedCalls: many(calls, { relationName: 'recipient' }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
  messages: many(messages),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sender',
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: 'recipient',
  }),
  group: one(groups, {
    fields: [messages.groupId],
    references: [groups.id],
  }),
  statuses: many(messageStatus),
}));

export const messageStatusRelations = relations(messageStatus, ({ one }) => ({
  message: one(messages, {
    fields: [messageStatus.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageStatus.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  caller: one(users, {
    fields: [calls.callerId],
    references: [users.id],
    relationName: 'caller',
  }),
  recipient: one(users, {
    fields: [calls.recipientId],
    references: [users.id],
    relationName: 'recipient',
  }),
  endedByUser: one(users, {
    fields: [calls.endedBy],
    references: [users.id],
    relationName: 'endedBy',
  }),
}));