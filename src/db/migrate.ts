import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate as drizzleMigrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Database migration module
 * Handles the execution of database migrations using Drizzle ORM
 * @module migrate
 */

// Create a connection pool for database operations
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'mobile_auth',
  ssl: false
});

// Initialize Drizzle with the connection pool
const db = drizzle(pool);

/**
 * Runs database migrations
 * @async
 * @function migrate
 * @returns {Promise<void>}
 */
export async function migrate() {
  console.log('Running migrations...');
  
  try {
    await drizzleMigrate(db, { migrationsFolder: 'src/db/migrations' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error; // Re-throw to be handled by the caller
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 