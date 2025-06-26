import { Request, Response } from 'express';
import { OAuthService } from '../services/oauth.service';
import { JWTService } from '../services/jwt.service';
import { db } from '../db';
import { users, sessions } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Controller handling authentication-related operations
 * @class AuthController
 */
export class AuthController {
  /**
   * Handles the Google OAuth callback
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {string} req.query.code - Authorization code from Google
   * @param {string} req.query.state - State parameter for CSRF protection
   * @returns {Promise<void>} Redirects to mobile app with tokens
   * @throws {Error} If authentication fails
   */
  static async googleCallback(req: Request, res: Response) {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      // Exchange the authorization code for tokens
      const tokens = await OAuthService.getGoogleOAuthTokens(code);
      
      // Verify the ID token and get user information
      const payload = await OAuthService.verifyGoogleIdToken(tokens.id_token!);
      
      if (!payload) {
        return res.status(401).json({ error: 'Invalid ID token' });
      }

      // Find or create user in database
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.googleId, payload.sub))
        .limit(1);

      if (!user) {
        [user] = await db
          .insert(users)
          .values({
            googleId: payload.sub,
            email: payload.email!,
            name: payload.name!,
          })
          .returning();
      }

      // Generate tokens
      const accessToken = JWTService.signAccessToken({ userId: user.id });
      const refreshToken = JWTService.generateRefreshToken();
      const expiresAt = JWTService.getRefreshTokenExpiryDate();

      // Store refresh token
      await db
        .insert(sessions)
        .values({
          userId: user.id,
          refreshToken,
          expiresAt,
        });

      // Redirect to mobile app with tokens
      const redirectUrl = `${process.env.MOBILE_APP_SCHEME}://${process.env.MOBILE_APP_DOMAIN}/callback?` +
        new URLSearchParams({
          accessToken,
          refreshToken,
        }).toString();

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }

  /**
   * Refreshes an access token using a valid refresh token
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {string} req.body.refreshToken - Valid refresh token
   * @returns {Promise<Response>} New access and refresh tokens
   * @throws {Error} If token refresh fails
   */
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      // Find valid session
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.refreshToken, refreshToken))
        .limit(1);

      if (!session || new Date() > session.expiresAt) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
      }

      // Generate new tokens
      const accessToken = JWTService.signAccessToken({ userId: session.userId });
      const newRefreshToken = JWTService.generateRefreshToken();
      const expiresAt = JWTService.getRefreshTokenExpiryDate();

      // Update session
      await db
        .update(sessions)
        .set({
          refreshToken: newRefreshToken,
          expiresAt,
        })
        .where(eq(sessions.id, session.id));

      res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }

  /**
   * Logs out a user by invalidating their refresh token
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {string} req.body.refreshToken - Refresh token to invalidate
   * @returns {Promise<Response>} Success message
   * @throws {Error} If logout fails
   */
  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      // Delete session
      await db
        .delete(sessions)
        .where(eq(sessions.refreshToken, refreshToken));

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }
} 