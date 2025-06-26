import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';

/**
 * Extends Express Request type to include user information
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * User information extracted from JWT
       */
      user?: {
        userId: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void | Response} Proceeds to next middleware or returns error response
 * @throws {Error} If token verification fails
 * 
 * @example
 * // Usage in routes
 * router.get('/protected', authenticateToken, (req, res) => {
 *   // Access authenticated user
 *   const userId = req.user?.userId;
 * });
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  try {
    const payload = JWTService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}; 