import { Router } from 'express';
import { body, query } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

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

export default router; 