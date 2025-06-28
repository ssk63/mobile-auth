import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';
import { TokenPayload } from '../services/jwt.service';
import { createError, handleError } from '../utils/error';

/**
 * Extends Express Request type to include user information
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * User information extracted from JWT
       */
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void | Response} Proceeds to next middleware or returns error response
 * 
 * @example
 * // Usage in routes
 * router.get('/protected', authenticateToken, (req, res) => {
 *   // Access authenticated user
 *   const userId = req.user?.userId;
 *   const email = req.user?.email;
 * });
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw createError.unauthorized('Authorization header is missing', 'AUTH_HEADER_MISSING');
    }

    const [scheme, token] = authHeader.split(' ');
    
    if (scheme !== 'Bearer' || !token) {
      throw createError.unauthorized('Invalid authorization format. Use: Bearer <token>', 'INVALID_AUTH_FORMAT');
    }

    const payload = JWTService.verifyAccessToken(token);
    
    // Ensure all required fields are present
    if (!payload.userId || !payload.email) {
      throw createError.forbidden('Invalid token payload', 'INVALID_TOKEN_PAYLOAD');
    }

    // Set the complete user payload
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token has been revoked') {
        return handleError(
          createError.unauthorized('Token has been revoked', 'TOKEN_REVOKED'),
          res
        );
      }
      if (error.message === 'Token has expired') {
        return handleError(
          createError.unauthorized('Token has expired', 'TOKEN_EXPIRED'),
          res
        );
      }
    }
    return handleError(
      createError.forbidden('Invalid token', 'INVALID_TOKEN'),
      res
    );
  }
}; 