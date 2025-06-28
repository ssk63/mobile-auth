import { Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { users, sessions } from '../db/schema';
import { OAuthService } from '../services/oauth.service';
import { JWTService } from '../services/jwt.service';
import { createError, handleError } from '../utils/error';
import { EmailService } from '../services/email.service';

/**
 * Gets basic device info from request headers
 */
function getDeviceInfo(req: Request) {
  return {
    userAgent: req.headers['user-agent'],
    platform: req.headers['sec-ch-ua-platform'],
    mobile: req.headers['sec-ch-ua-mobile'],
  };
}

const emailService = new EmailService();

/**
 * Authentication controller handling OAuth and session management
 */
export class AuthController {
  /**
   * Initiates Google OAuth flow
   */
  static async googleLogin(_req: Request, res: Response) {
    try {
      const authUrl = OAuthService.getAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error('Google login error:', error);
      handleError(
        createError.internal('Failed to initiate Google login', 'GOOGLE_LOGIN_FAILED'),
        res
      );
    }
  }

  /**
   * Handles OAuth callback and user authentication
   */
  static async googleCallback(req: Request, res: Response) {
    try {
      const { code } = req.query;
      
      if (typeof code !== 'string') {
        throw createError.badRequest('Invalid authorization code', 'INVALID_AUTH_CODE');
      }

      // Exchange code for tokens
      const tokens = await OAuthService.getGoogleOAuthTokens(code);
      if (!tokens.access_token) {
        throw createError.internal('Failed to obtain access token', 'TOKEN_EXCHANGE_FAILED');
      }

      // Get user info
      const userInfo = await OAuthService.getGoogleUserInfo(tokens.access_token);

      // Find or create user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userInfo.email));

      if (!user) {
        [user] = await db
          .insert(users)
          .values({
            email: userInfo.email,
            name: userInfo.name ?? '',
            googleId: userInfo.sub,
            lastLoginAt: new Date(),
            loginCount: 1,
          })
          .returning();
      } else {
        // Update login stats
        [user] = await db
          .update(users)
          .set({
            lastLoginAt: new Date(),
            loginCount: sql`${users.loginCount} + 1`,
          })
          .where(eq(users.id, user.id))
          .returning();
      }

      // Generate tokens
      const accessToken = JWTService.signAccessToken({
        userId: user.id,
        email: user.email,
      });

      const refreshToken = JWTService.generateRefreshToken();
      const expiryDate = JWTService.getRefreshTokenExpiryDate();

      // Store refresh token with device info
      await db
        .insert(sessions)
        .values({
          userId: user.id,
          refreshToken,
          expiresAt: expiryDate,
          deviceInfo: getDeviceInfo(req),
          lastUsedAt: new Date(),
          ipAddress: req.ip,
        });

      // Redirect to app with tokens
      const redirectUrl = new URL(process.env.APP_REDIRECT_URL || 'myauthapp://auth/callback');
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Google callback error:', error);
      handleError(
        error instanceof Error 
          ? createError.internal(error.message, 'GOOGLE_CALLBACK_FAILED')
          : createError.internal('Authentication failed', 'AUTH_FAILED'),
        res
      );
    }
  }

  /**
   * Refreshes access token using refresh token
   */
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw createError.badRequest('Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
      }

      // Find valid session
      const [session] = await db
        .select({
          session: sessions,
          user: users,
        })
        .from(sessions)
        .where(eq(sessions.refreshToken, refreshToken))
        .innerJoin(users, eq(users.id, sessions.userId));

      if (!session) {
        throw createError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      }

      if (new Date() > session.session.expiresAt) {
        throw createError.unauthorized('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
      }

      // Generate new tokens
      const accessToken = JWTService.signAccessToken({
        userId: session.user.id,
        email: session.user.email,
      });

      const newRefreshToken = JWTService.generateRefreshToken();
      const expiryDate = JWTService.getRefreshTokenExpiryDate();

      // Update session with new token and usage info
      await db
        .update(sessions)
        .set({
          refreshToken: newRefreshToken,
          expiresAt: expiryDate,
          lastUsedAt: new Date(),
          deviceInfo: getDeviceInfo(req),
          ipAddress: req.ip,
        })
        .where(eq(sessions.refreshToken, refreshToken));

      res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      handleError(
        error instanceof Error
          ? error
          : createError.internal('Failed to refresh token', 'TOKEN_REFRESH_FAILED'),
        res
      );
    }
  }

  /**
   * Logs out user by invalidating tokens and removing all sessions
   */
  static async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers['authorization'];
      const accessToken = authHeader?.split(' ')[1];

      if (!req.user?.userId) {
        throw createError.unauthorized('User not authenticated', 'USER_NOT_AUTHENTICATED');
      }

      if (accessToken) {
        // Blacklist the access token
        JWTService.blacklistToken(accessToken);
      }

      // Delete all sessions for this user for complete logout
      await db
        .delete(sessions)
        .where(eq(sessions.userId, req.user.userId));

      res.json({ 
        status: 'success',
        message: 'Logged out successfully' 
      });
    } catch (error) {
      console.error('Logout error:', error);
      handleError(
        error instanceof Error
          ? error
          : createError.internal('Logout failed', 'LOGOUT_FAILED'),
        res
      );
    }
  }

  /**
   * Request email verification code
   */
  static async requestEmailVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;
      await emailService.sendVerificationCode(email);
      
      res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
      });
    } catch (error) {
      console.error('Error sending verification code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification code',
      });
    }
  }

  /**
   * Verify email code and create/login user
   */
  static async verifyEmailCode(req: Request, res: Response) {
    try {
      const { email, code } = req.body;
      
      const isValid = await emailService.verifyCode(email, code);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code',
        });
      }

      // Check if user exists
      let user = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (user.length === 0) {
        // Create new user
        const [newUser] = await db.insert(users).values({
          email,
          name: email.split('@')[0], // Use email prefix as name
          lastLoginAt: new Date(),
          loginCount: 1,
        }).returning();
        user = [newUser];
      } else {
        // Update existing user's login info
        const currentLoginCount = user[0]?.loginCount ?? 0;
        await db.update(users)
          .set({
            lastLoginAt: new Date(),
            loginCount: currentLoginCount + 1,
          })
          .where(eq(users.id, user[0].id));
      }

      // Generate tokens
      const accessToken = JWTService.signAccessToken({
        userId: user[0].id,
        email: user[0].email,
      });
      const refreshToken = JWTService.generateRefreshToken();

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: user[0],
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      console.error('Error verifying email code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify email code',
      });
    }
  }
} 