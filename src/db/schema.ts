import { pgTable, text, timestamp, uuid, varchar, index } from 'drizzle-orm/pg-core';

/**
 * Users table schema
 * Stores user information from Google OAuth authentication
 * @property {string} id - Unique identifier for the user
 * @property {string} googleId - Google account ID
 * @property {string} email - User's email address
 * @property {string} name - User's full name
 * @property {Date} createdAt - Timestamp of user creation
 * @property {Date} updatedAt - Timestamp of last update
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  googleId: varchar('google_id', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  googleIdIdx: index('google_id_idx').on(table.googleId),
  emailIdx: index('email_idx').on(table.email),
}));

/**
 * Sessions table schema
 * Stores refresh tokens and their associated data
 * @property {string} id - Unique identifier for the session
 * @property {string} userId - Reference to the user who owns this session
 * @property {string} refreshToken - Refresh token for JWT renewal
 * @property {Date} expiresAt - Timestamp when the refresh token expires
 * @property {Date} createdAt - Timestamp of session creation
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  refreshTokenIdx: index('refresh_token_idx').on(table.refreshToken),
  expiryIdx: index('expiry_idx').on(table.expiresAt),
})); 