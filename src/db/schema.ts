import { pgTable, text, timestamp, uuid, varchar, index, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

/**
 * Users table schema
 * Stores user information from Google OAuth authentication
 * @property {string} id - Unique identifier for the user
 * @property {string} googleId - Google account ID
 * @property {string} email - User's email address
 * @property {string} name - User's full name
 * @property {Date} lastLoginAt - Timestamp of user's last login
 * @property {number} loginCount - Number of times user has logged in
 * @property {Date} createdAt - Timestamp of user creation
 * @property {Date} updatedAt - Timestamp of last update
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  googleId: varchar('google_id', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  loginCount: integer('login_count').default(0),
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
 * @property {Object} deviceInfo - Information about the device used for this session
 * @property {Date} lastUsedAt - Timestamp of last session activity
 * @property {string} ipAddress - IP address of the client
 * @property {Date} createdAt - Timestamp of session creation
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  deviceInfo: jsonb('device_info'),
  lastUsedAt: timestamp('last_used_at'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  refreshTokenIdx: index('refresh_token_idx').on(table.refreshToken),
  expiryIdx: index('expiry_idx').on(table.expiresAt),
}));

/**
 * Verification codes table schema
 * Stores email verification codes for authentication
 * @property {string} id - Unique identifier for the verification code
 * @property {string} email - Email address the code was sent to
 * @property {string} code - The verification code
 * @property {Date} expiresAt - When the code expires
 * @property {boolean} used - Whether the code has been used
 * @property {Date} createdAt - When the code was created
 */
export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('verification_codes_email_idx').on(table.email),
  codeIdx: index('verification_codes_code_idx').on(table.code),
})); 