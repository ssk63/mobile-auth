import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'crypto';

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
  name: string;
  picture: string;
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
type GoogleTokens = {
  access_token: string | undefined;
  refresh_token: string | undefined;
  id_token: string | undefined;
  expiry_date: number | undefined;
  scope: string | undefined;
  token_type: string | undefined;
};

/**
 * Service for handling Google OAuth authentication
 * @class OAuthService
 */
export class OAuthService {
  private static readonly CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
  private static readonly CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
  private static readonly REDIRECT_URI = `${process.env.APP_URL}/auth/callback`;

  private static oAuth2Client = new OAuth2Client(
    OAuthService.CLIENT_ID,
    OAuthService.CLIENT_SECRET,
    OAuthService.REDIRECT_URI
  );

  /**
   * Generates the Google OAuth authorization URL
   * @param {string} state - CSRF protection token
   * @returns {string} Authorization URL
   * @throws {Error} If OAuth credentials are not configured
   */
  static getGoogleAuthURL(state: string): string {
    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return OAuthService.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state,
    });
  }

  /**
   * Exchanges authorization code for OAuth tokens
   * @param {string} code - Authorization code from Google
   * @returns {Promise<GoogleTokens>} OAuth tokens
   * @throws {Error} If token exchange fails
   */
  static async getGoogleOAuthTokens(code: string): Promise<GoogleTokens> {
    try {
      const { tokens } = await OAuthService.oAuth2Client.getToken(code);
      OAuthService.oAuth2Client.setCredentials(tokens);
      
      return {
        access_token: tokens.access_token ?? undefined,
        refresh_token: tokens.refresh_token ?? undefined,
        id_token: tokens.id_token ?? undefined,
        expiry_date: tokens.expiry_date ?? undefined,
        scope: tokens.scope ?? undefined,
        token_type: tokens.token_type ?? undefined,
      };
    } catch (error) {
      console.error('Error getting Google OAuth tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Fetches user information using access token
   * @param {string} accessToken - Valid Google access token
   * @returns {Promise<GoogleUserInfo>} User profile information
   * @throws {Error} If fetching user info fails
   */
  static async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const client = new OAuth2Client();
      client.setCredentials({ access_token: accessToken });

      const userInfoClient = await client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      });

      const userInfo = userInfoClient.data as GoogleUserInfo;
      if (!userInfo.sub || !userInfo.email) {
        throw new Error('Invalid user info response');
      }

      return userInfo;
    } catch (error) {
      console.error('Error getting Google user info:', error);
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Verifies and decodes Google ID token
   * @param {string} idToken - Google ID token to verify
   * @returns {Promise<any>} Decoded token payload
   * @throws {Error} If token verification fails
   */
  static async verifyGoogleIdToken(idToken: string) {
    try {
      const ticket = await OAuthService.oAuth2Client.verifyIdToken({
        idToken,
        audience: OAuthService.CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid ID token payload');
      }

      return payload;
    } catch (error) {
      console.error('Error verifying Google ID token:', error);
      throw new Error('Failed to verify ID token');
    }
  }
} 