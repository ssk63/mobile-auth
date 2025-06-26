import jwt, { SignOptions } from 'jsonwebtoken';
import { randomBytes } from 'crypto';

/**
 * Interface for JWT payload
 * @interface TokenPayload
 */
interface TokenPayload {
  userId: string;
}

/**
 * Service for handling JWT operations
 * @class JWTService
 */
export class JWTService {
  private static readonly JWT_SECRET: string = process.env.JWT_SECRET || 'default-secret-key';
  private static readonly JWT_EXPIRES_IN: SignOptions['expiresIn'] = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN: string = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  /**
   * Signs a new access token
   * @param {TokenPayload} payload - Data to be included in the token
   * @returns {string} Signed JWT token
   */
  static signAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
  }

  /**
   * Verifies and decodes a JWT token
   * @param {string} token - JWT token to verify
   * @returns {TokenPayload} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
  }

  /**
   * Generates a cryptographically secure refresh token
   * @returns {string} Random refresh token
   */
  static generateRefreshToken(): string {
    return randomBytes(40).toString('hex');
  }

  /**
   * Calculates the expiry date for a refresh token
   * @returns {Date} Expiry date for the refresh token
   */
  static getRefreshTokenExpiryDate(): Date {
    const expiresIn = this.REFRESH_TOKEN_EXPIRES_IN;
    const days = parseInt(expiresIn.replace('d', ''));
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
} 