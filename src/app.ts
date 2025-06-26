import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import { db } from './db';
import { users } from './db/schema';
import { sql } from 'drizzle-orm';

/**
 * Express application instance
 * Configures middleware, routes, and error handling
 * @module app
 */

const app = express();

/**
 * Rate limiting configuration
 * Protects against brute force and DDoS attacks
 * @constant {RateLimitRequestHandler}
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

// Middleware setup
app.use(express.json());

/**
 * CORS configuration
 * Allows requests from specified origins
 * @constant {string[]} allowedOrigins - List of allowed origins from environment or defaults
 */
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'exp://localhost:19000'],
  credentials: true,
}));

// Apply basic rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

/**
 * Health check endpoint
 * Used for monitoring service status
 * @route GET /health
 * @returns {Object} Status information with timestamp
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Database connection test endpoint
 * @route GET /db-test
 * @returns {Object} Database connection status
 */
app.get('/db-test', async (req, res) => {
  try {
    // Test raw SQL query
    const sqlResult = await db.execute(sql`SELECT 1 as result`);
    
    // Test table query
    const usersCount = await db.select({ count: sql`count(*)` }).from(users);
    
    res.json({ 
      status: 'ok',
      message: 'Database connection successful',
      sqlTest: sqlResult,
      usersCount: usersCount[0].count
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mount authentication routes
app.use('/auth', authRoutes);

/**
 * Global error handling middleware
 * Catches unhandled errors and returns appropriate response
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app; 