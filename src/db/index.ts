import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Database configuration and connection management
 * @module db
 */

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  max?: number;
  idleTimeoutMillis?: number;
}

/**
 * Get database configuration from environment variables
 */
function getDatabaseConfig(): DatabaseConfig {
  // If DATABASE_URL is provided, parse it
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading '/'
        ssl: process.env.DB_SSL === 'true',
        max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      };
    } catch (error) {
      console.warn('Failed to parse DATABASE_URL, falling back to individual env vars');
    }
  }

  // Fallback to individual environment variables
  return {
    host: process.env.DB_HOST || 'postgres', // Default to Docker service name
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mobile_auth',
    ssl: process.env.DB_SSL === 'true',
    max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  };
}

// Create a connection pool for database operations
export const pool = new Pool(getDatabaseConfig());

// Initialize Drizzle with the connection pool and schema
export const db = drizzle(pool, { schema });

/**
 * Run database migrations
 * @throws {Error} If migrations fail
 */
export async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    console.log('Database migrations completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Database migration failed: ${errorMessage}`);
  }
}

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Don't exit the process, just log the error
  console.error('Database connection will be retried automatically');
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Closing database pool...');
  pool.end().then(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Closing database pool...');
  pool.end().then(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
}); 