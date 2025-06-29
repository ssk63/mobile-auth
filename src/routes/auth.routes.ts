import { Router } from 'express';
import { body, query } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate, emailVerificationRules, verifyCodeRules } from '../middleware/validation.middleware';

const router = Router();

// Rate limiter for email verification endpoints
const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { 
    success: false, 
    message: 'Too many verification attempts. Please try again after 15 minutes.' 
  }
});

// Rate limiter for code verification attempts
const codeVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { 
    success: false, 
    message: 'Too many code verification attempts. Please try again after 15 minutes.' 
  }
});

/**
 * @route GET /auth/google/login
 * @desc Initiates Google OAuth flow
 * @returns {void} - Redirects to Google consent screen
 * @access Public
 */
router.get('/google/login', AuthController.googleLogin);

/**
 * @route GET /auth/callback
 * @desc Google OAuth callback endpoint
 * @param {string} code - Authorization code from Google
 * @returns {void} - Redirects to mobile app with tokens
 * @access Public
 */
router.get('/callback', 
  validate([
    query('code').isString().notEmpty().withMessage('Authorization code is required')
  ]),
  AuthController.googleCallback
);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token using refresh token
 * @param {string} refreshToken - Valid refresh token
 * @returns {Object} { accessToken: string, refreshToken: string }
 * @access Public
 */
router.post('/refresh',
  validate([
    body('refreshToken').isString().notEmpty().withMessage('Refresh token is required')
  ]),
  AuthController.refreshToken
);

/**
 * @route POST /auth/logout
 * @desc Logout user and invalidate refresh token
 * @param {string} refreshToken - Valid refresh token
 * @returns {Object} { message: string }
 * @access Protected - Requires valid access token
 */
router.post('/logout',
  authenticateToken,
  validate([
    body('refreshToken').isString().notEmpty().withMessage('Refresh token is required')
  ]),
  AuthController.logout
);

/**
 * @route POST /auth/email/request-code
 * @desc Request an email verification code for authentication
 * @param {Object} req.body
 * @param {string} req.body.email - Email address to send verification code to
 * @returns {Object} { 
 *   success: boolean,
 *   message: string 
 * }
 * @example
 * POST /auth/email/request-code
 * {
 *   "email": "user@example.com"
 * }
 * @example Response
 * {
 *   "success": true,
 *   "message": "Verification code sent successfully"
 * }
 * @access Public
 */
router.post(
  '/email/request-code',
  emailVerificationLimiter,
  emailVerificationRules,
  validate,
  AuthController.requestEmailVerification
);

/**
 * @route POST /auth/email/verify
 * @desc Verify email code and create/login user
 * @param {Object} req.body
 * @param {string} req.body.email - Email address that received the code
 * @param {string} req.body.code - 6-digit verification code
 * @returns {Object} {
 *   success: boolean,
 *   message: string,
 *   data?: {
 *     user: {
 *       id: string,
 *       email: string,
 *       name: string,
 *       lastLoginAt: Date,
 *       loginCount: number,
 *       createdAt: Date,
 *       updatedAt: Date
 *     },
 *     accessToken: string,
 *     refreshToken: string
 *   }
 * }
 * @example
 * POST /auth/email/verify
 * {
 *   "email": "user@example.com",
 *   "code": "123456"
 * }
 * @example Response
 * {
 *   "success": true,
 *   "message": "Email verified successfully",
 *   "data": {
 *     "user": {
 *       "id": "uuid",
 *       "email": "user@example.com",
 *       "name": "user",
 *       "lastLoginAt": "2024-01-01T00:00:00.000Z",
 *       "loginCount": 1,
 *       "createdAt": "2024-01-01T00:00:00.000Z",
 *       "updatedAt": "2024-01-01T00:00:00.000Z"
 *     },
 *     "accessToken": "jwt.token.here",
 *     "refreshToken": "refresh.token.here"
 *   }
 * }
 * @access Public
 */
router.post(
  '/email/verify',
  codeVerificationLimiter,
  verifyCodeRules,
  validate,
  AuthController.verifyEmailCode
);

export default router; 