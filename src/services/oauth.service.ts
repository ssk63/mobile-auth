import { OAuth2Client } from 'google-auth-library';
import { createError } from '../utils/error';

/**
 * Interface representing Google user information
 * @interface GoogleUserInfo
 * @property {string} sub - Unique Google account identifier
 * @property {string} email - User's email address
 * @property {string} name - User's full name
 * @property {string} picture - URL to user's profile picture
 */
interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

/**
 * Type representing Google OAuth tokens
 * @typedef {Object} GoogleTokens
 * @property {string} [access_token] - Short-lived token for API access
 * @property {string} [refresh_token] - Long-lived token for access token renewal
 * @property {string} [id_token] - JWT containing user information
 * @property {number} [expiry_date] - Token expiration timestamp
 * @property {string} [scope] - Granted permission scopes
 * @property {string} [token_type] - Type of token (usually 'Bearer')
 */
interface GoogleTokens {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
}

/**
 * Service for handling Google OAuth authentication
 * @class OAuthService
 */
export class OAuthService {
  private static readonly CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  private static readonly REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
  private static readonly SCOPES = process.env.GOOGLE_OAUTH_SCOPES?.split(',') || [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  private static readonly oAuth2Client = new OAuth2Client(
    OAuthService.CLIENT_ID,
    OAuthService.CLIENT_SECRET,
    OAuthService.REDIRECT_URI
  );

  /**
   * Generates the Google OAuth consent screen URL
   * @returns {string} Authorization URL
   * @throws {AppError} If OAuth credentials are not configured
   */
  static getAuthUrl(): string {
    const missingVars = [];
    if (!this.CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
    if (!this.CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
    if (!this.REDIRECT_URI) missingVars.push('GOOGLE_REDIRECT_URI');
    
    if (missingVars.length > 0) {
      throw createError.internal(
        `Google OAuth credentials not configured: missing ${missingVars.join(', ')}`,
        'OAUTH_CONFIG_MISSING'
      );
    }

    return OAuthService.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: OAuthService.SCOPES,
      prompt: 'consent',
    });
  }

  /**
   * Exchanges authorization code for OAuth tokens
   * @param {string} code - Authorization code from Google
   * @returns {Promise<GoogleTokens>} OAuth tokens
   * @throws {AppError} If token exchange fails
   */
  static async getGoogleOAuthTokens(code: string): Promise<GoogleTokens> {
    try {
      const { tokens } = await OAuthService.oAuth2Client.getToken(code);
      return {
        access_token: tokens.access_token || undefined,
        refresh_token: tokens.refresh_token || undefined,
        id_token: tokens.id_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
        scope: tokens.scope || undefined,
        token_type: tokens.token_type || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw createError.internal(
        `Failed to exchange authorization code: ${errorMessage}`,
        'TOKEN_EXCHANGE_FAILED'
      );
    }
  }

  /**
   * Fetches user information using access token
   * @param {string} accessToken - Valid Google access token
   * @returns {Promise<GoogleUserInfo>} User profile information
   * @throws {AppError} If fetching user info fails
   */
  static async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const client = new OAuth2Client();
      client.setCredentials({ access_token: accessToken });
      
      const response = await client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo',
        timeout: 5000,
        retry: true
      });

      const userInfo = response.data as GoogleUserInfo;
      if (!userInfo.sub || !userInfo.email) {
        throw createError.badRequest(
          'Invalid user info response: missing required fields',
          'INVALID_USER_INFO'
        );
      }

      return userInfo;
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid user info response: missing required fields') {
        throw error; // Re-throw our own AppError
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw createError.internal(
        `Failed to fetch user information: ${errorMessage}`,
        'USER_INFO_FETCH_FAILED'
      );
    }
  }

  /**
   * Verifies and decodes Google ID token
   * @param {string} idToken - Google ID token to verify
   * @returns {Promise<Record<string, any>>} Decoded token payload
   * @throws {AppError} If token verification fails
   */
  static async verifyGoogleIdToken(idToken: string): Promise<Record<string, any>> {
    try {
      const ticket = await OAuthService.oAuth2Client.verifyIdToken({
        idToken,
        audience: OAuthService.CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw createError.unauthorized(
          'Invalid ID token: empty payload',
          'INVALID_ID_TOKEN'
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid ID token: empty payload') {
        throw error; // Re-throw our own AppError
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw createError.unauthorized(
        `Failed to verify ID token: ${errorMessage}`,
        'ID_TOKEN_VERIFICATION_FAILED'
      );
    }
  }
} 