import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const groupRoleEnum = pgEnum('group_role', ['member', 'admin', 'owner']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'file', 'audio', 'video']);
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read']);
export const notificationTypeEnum = pgEnum('notification_type', ['message', 'group_invite', 'group_update', 'system']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 50 }),
  lastName: varchar('last_name', { length: 50 }),
  avatar: text('avatar'),
  bio: text('bio'),
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen'),
  role: userRoleEnum('role').default('user'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  usernameIdx: index('users_username_idx').on(table.username),
  emailIdx: index('users_email_idx').on(table.email),
  isOnlineIdx: index('users_is_online_idx').on(table.isOnline)
}));

// Groups table
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  avatar: text('avatar'),
  isPrivate: boolean('is_private').default(false),
  inviteCode: varchar('invite_code', { length: 50 }).unique(),
  maxMembers: integer('max_members').default(100),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  nameIdx: index('groups_name_idx').on(table.name),
  inviteCodeIdx: index('groups_invite_code_idx').on(table.inviteCode),
  createdByIdx: index('groups_created_by_idx').on(table.createdBy)
}));

// Group members table
export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: groupRoleEnum('role').default('member'),
  joinedAt: timestamp('joined_at').defaultNow(),
  invitedBy: uuid('invited_by').references(() => users.id)
}, (table) => ({
  groupUserIdx: index('group_members_group_user_idx').on(table.groupId, table.userId),
  userIdx: index('group_members_user_idx').on(table.userId),
  groupIdx: index('group_members_group_idx').on(table.groupId)
}));

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  messageType: messageTypeEnum('message_type').default('text'),
  fileUrl: text('file_url'),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  replyToId: uuid('reply_to_id').references(() => messages.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  senderIdx: index('messages_sender_idx').on(table.senderId),
  recipientIdx: index('messages_recipient_idx').on(table.recipientId),
  groupIdx: index('messages_group_idx').on(table.groupId),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
  conversationIdx: index('messages_conversation_idx').on(table.senderId, table.recipientId),
  replyToIdx: index('messages_reply_to_idx').on(table.replyToId)
}));

// Message status table
export const messageStatus = pgTable('message_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: messageStatusEnum('status').notNull(),
  timestamp: timestamp('timestamp').defaultNow()
}, (table) => ({
  messageUserIdx: index('message_status_message_user_idx').on(table.messageId, table.userId),
  messageIdx: index('message_status_message_idx').on(table.messageId),
  userIdx: index('message_status_user_idx').on(table.userId)
}));

// Typing indicators table
export const typingIndicators = pgTable('typing_indicators', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  isTyping: boolean('is_typing').default(true),
  lastTyped: timestamp('last_typed').defaultNow()
}, (table) => ({
  userRecipientIdx: index('typing_indicators_user_recipient_idx').on(table.userId, table.recipientId),
  userGroupIdx: index('typing_indicators_user_group_idx').on(table.userId, table.groupId),
  lastTypedIdx: index('typing_indicators_last_typed_idx').on(table.lastTyped)
}));

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').notNull(),
  data: text('data'), // JSON data
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt)
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: 'sender' }),
  receivedMessages: many(messages, { relationName: 'recipient' }),
  groupMemberships: many(groupMembers),
  createdGroups: many(groups),
  messageStatuses: many(messageStatus),
  typingIndicators: many(typingIndicators),
  notifications: many(notifications)
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
    relationName: 'creator'
  }),
  members: many(groupMembers),
  messages: many(messages)
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id]
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id]
  }),
  inviter: one(users, {
    fields: [groupMembers.invitedBy],
    references: [users.id],
    relationName: 'inviter'
  })
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sender'
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: 'recipient'
  }),
  group: one(groups, {
    fields: [messages.groupId],
    references: [groups.id]
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
    relationName: 'replyTo'
  }),
  replies: many(messages, { relationName: 'replyTo' }),
  statuses: many(messageStatus)
}));

export const messageStatusRelations = relations(messageStatus, ({ one }) => ({
  message: one(messages, {
    fields: [messageStatus.messageId],
    references: [messages.id]
  }),
  user: one(users, {
    fields: [messageStatus.userId],
    references: [users.id]
  })
}));

export const typingIndicatorsRelations = relations(typingIndicators, ({ one }) => ({
  user: one(users, {
    fields: [typingIndicators.userId],
    references: [users.id]
  }),
  recipient: one(users, {
    fields: [typingIndicators.recipientId],
    references: [users.id],
    relationName: 'recipient'
  }),
  group: one(groups, {
    fields: [typingIndicators.groupId],
    references: [groups.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));