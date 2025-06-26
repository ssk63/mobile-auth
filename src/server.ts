import * as dotenv from 'dotenv';
import app from './app';
import { migrate } from './db/migrate';
import { pool } from './db';

/**
 * Server initialization module
 * Handles server startup, database connection, and graceful shutdown
 * @module server
 */

// Load environment variables
dotenv.config();

const port = process.env.PORT || 3000;

/**
 * Starts the server with database connection and migration checks
 * @async
 * @function startServer
 * @returns {Promise<void>}
 * @throws {Error} If server startup fails
 */
const startServer = async () => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    console.log('Database connection successful');

    // Run migrations in production
    if (process.env.NODE_ENV === 'production') {
      await migrate();
    }

    const server = app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

    // Graceful shutdown handler
    const shutdown = () => {
      console.log('Shutting down gracefully...');
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    await pool.end();
    process.exit(1);
  }
};

// Initialize server
startServer(); 