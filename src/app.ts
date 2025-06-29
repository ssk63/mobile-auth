import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { createError, handleError } from './utils/error';
import { EmailService } from './services/email.service';

/**
 * Express application instance
 * Configures middleware, routes, and error handling
 * @module app
 */

const app = express();

// Initialize email service and start cleanup schedule
const emailService = new EmailService();
emailService.startCleanupSchedule(
  parseInt(process.env.VERIFICATION_CODE_CLEANUP_INTERVAL_MINUTES || '60', 10)
);

// Essential security headers
app.use(helmet({
  // Disable features not needed for API backend
  contentSecurityPolicy: false, // Not needed for API-only backend
  crossOriginEmbedderPolicy: false, // Not needed for API-only backend
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow mobile app access
}));

// Body parser with size limit
app.use(express.json({ 
  limit: '10kb',
  verify: (req: Request, res: Response, buf: Buffer, encoding: string) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      handleError(
        createError.badRequest('Invalid JSON payload', 'INVALID_JSON'),
        res
      );
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10kb' 
}));

/**
 * Rate limiting configuration
 * Protects against brute force and DDoS attacks
 * @constant {RateLimitRequestHandler}
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  handler: (req: Request, res: Response) => {
    handleError(
      createError.tooMany('Too many requests, please try again later.', 'RATE_LIMIT_EXCEEDED'),
      res
    );
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true // Only count failed attempts
});

/**
 * CORS configuration
 * Allows requests from specified origins
 * @constant {string[]} allowedOrigins - List of allowed origins from environment or defaults
 */
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
}));

// Apply rate limiting
app.use(limiter);

/**
 * Root route
 * Provides API information and health status
 * @route GET /
 * @returns {Object} API information
 */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Mobile Auth Backend',
    version: '1.0.0',
    description: 'OAuth 2.0 authentication service for mobile applications',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        google: '/auth/google/login',
        callback: '/auth/callback',
        refresh: '/auth/refresh',
        logout: '/auth/logout',
        email: {
          requestCode: '/auth/email/request-code',
          verify: '/auth/email/verify'
        }
      },
      health: '/health'
    }
  });
});

/**
 * Health check endpoint
 * Used for monitoring service status
 * @route GET /health
 * @returns {Object} Status information with timestamp
 */
app.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Check database connection with a simple query
    await db.execute(sql`SELECT 1`);
    
    res.json({
      status: 'healthy',
      services: {
        api: 'up',
        database: 'up'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(createError.internal('Database health check failed', 'DB_HEALTH_CHECK_FAILED'));
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
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  handleError(err, res);
});

// 404 handler
app.use((req: Request, res: Response) => {
  handleError(
    createError.notFound(
      `Cannot ${req.method} ${req.path}`,
      'ROUTE_NOT_FOUND'
    ),
    res
  );
});

export default app; 