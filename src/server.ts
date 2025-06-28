import * as dotenv from 'dotenv';

// Load environment variables before any other imports
dotenv.config();

import app from './app';
import { pool, runMigrations } from './db';
import { createError } from './utils/error';

/**
 * Server initialization module
 * Handles server startup, database connection, and graceful shutdown
 * @module server
 */

const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';

// Log environment variables for debugging
console.log('\n🔐 OAuth Configuration:');
console.log(`   → Client ID:        ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`   → Client Secret:    ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   → Redirect URI:     ${process.env.GOOGLE_REDIRECT_URI ? '✅ Set' : '❌ Missing'}`);

/**
 * Gracefully shuts down the server
 * @param {Error} error - Error that triggered the shutdown
 * @returns {Promise<void>}
 */
async function shutdownGracefully(error: Error): Promise<void> {
  console.error('Server error:', error);
  try {
    await pool.end();
    console.log('Database connections closed.');
  } catch (dbError) {
    console.error('Error closing database connections:', dbError);
  }
  process.exit(1);
}

/**
 * Starts the Express server
 * @throws {AppError} If server startup fails
 */
async function startServer(): Promise<void> {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();

    // Run migrations in production
    if (process.env.NODE_ENV === 'production') {
      await runMigrations();
    }

    // Start server
    app.listen(PORT, () => {
      console.log('\n🚀 Server launched at:');
      if (isDev) {
        console.log(`   → Development:     http://localhost:${PORT}`);
      } else {
        console.log(`   → Production:      ${process.env.APP_URL || `http://localhost:${PORT}`}`);
      }
      
      console.log('\n📱 Mobile App Integration:');
      console.log(`   → OAuth Callback:   ${isDev ? `http://localhost:${PORT}` : process.env.APP_URL}/auth/callback`);
      console.log(`   → Deep Link Scheme: myauthapp://auth/callback`);
      
      console.log('\n🔧 Environment:');
      console.log(`   → Mode:            ${isDev ? 'Development' : 'Production'}`);
      console.log(`   → Port:            ${PORT}`);
      console.log(`   → Database:        ${process.env.DB_NAME || 'mobile_auth'}`);
      
      console.log('\n👋 Welcome to Mobile Auth Backend!\n');
    });

  } catch (error) {
    throw createError.internal(
      'Failed to start server',
      'SERVER_STARTUP_FAILED'
    );
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error: Error) => {
  console.error('Uncaught exception:', error);
  await shutdownGracefully(error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (error: unknown) => {
  console.error('Unhandled rejection:', error);
  await shutdownGracefully(error instanceof Error ? error : new Error(String(error)));
});

// Handle termination signals
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal. Starting graceful shutdown...');
  await shutdownGracefully(new Error('Server terminated by SIGTERM'));
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT signal. Starting graceful shutdown...');
  await shutdownGracefully(new Error('Server terminated by SIGINT'));
});

// Start the server
startServer().catch(async (error) => {
  await shutdownGracefully(error);
}); 