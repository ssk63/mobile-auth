import { SignOptions, sign, verify, Secret } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { createError } from '../utils/error';

/**
 * Interface for JWT payload
 * @interface TokenPayload
 */
export interface TokenPayload {
  userId: string;
  email: string;
  [key: string]: unknown;
}

type StringOrNumber = string | number;

/**
 * Service for handling JWT operations
 * @class JWTService
 */
export class JWTService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d';
  private static readonly tokenBlacklist = new Set<string>();

  /**
   * Adds a token to the blacklist
   * @param {string} token - Token to blacklist
   */
  static blacklistToken(token: string): void {
    this.tokenBlacklist.add(token);
  }

  /**
   * Checks if a token is blacklisted
   * @param {string} token - Token to check
   * @returns {boolean} True if token is blacklisted
   */
  static isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  /**
   * Signs a new access token
   * @param {TokenPayload} payload - Data to be included in the token
   * @returns {string} Signed JWT token
   * @throws {AppError} If signing fails or payload is invalid
   */
  static signAccessToken(payload: TokenPayload): string {
    try {
      if (!payload.userId || !payload.email) {
        throw createError.badRequest(
          'Invalid token payload: missing required fields',
          'INVALID_TOKEN_PAYLOAD'
        );
      }

      const options: SignOptions = {
        expiresIn: this.JWT_EXPIRES_IN as SignOptions['expiresIn'],
        algorithm: 'HS256'
      };

      return sign(payload, this.JWT_SECRET, options);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid token payload: missing required fields') {
        throw error; // Re-throw our own AppError
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw createError.internal(
        `Failed to sign access token: ${errorMessage}`,
        'TOKEN_SIGNING_FAILED'
      );
    }
  }

  /**
   * Verifies and decodes a JWT token
   * @param {string} token - JWT token to verify
   * @returns {TokenPayload} Decoded token payload
   * @throws {AppError} If token is invalid, expired, or blacklisted
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      if (this.isTokenBlacklisted(token)) {
        throw createError.unauthorized(
          'Token has been revoked',
          'TOKEN_REVOKED'
        );
      }

      const decoded = verify(token, this.JWT_SECRET) as TokenPayload;
      
      if (!decoded.userId || !decoded.email) {
        throw createError.unauthorized(
          'Invalid token payload: missing required fields',
          'INVALID_TOKEN_PAYLOAD'
        );
      }

      return decoded;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw our own AppErrors
        if (error.message === 'Token has been revoked' || 
            error.message === 'Invalid token payload: missing required fields') {
          throw error;
        }
        // Handle JWT-specific errors
        if (error.name === 'TokenExpiredError') {
          throw createError.unauthorized('Token has expired', 'TOKEN_EXPIRED');
        }
        if (error.name === 'JsonWebTokenError') {
          throw createError.unauthorized('Invalid token', 'INVALID_TOKEN');
        }
      }
      throw createError.internal('Failed to verify token', 'TOKEN_VERIFICATION_FAILED');
    }
  }

  /**
   * Generates a cryptographically secure refresh token
   * @returns {string} Random refresh token
   * @throws {AppError} If token generation fails
   */
  static generateRefreshToken(): string {
    try {
      return randomBytes(40).toString('hex');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw createError.internal(
        `Failed to generate refresh token: ${errorMessage}`,
        'REFRESH_TOKEN_GENERATION_FAILED'
      );
    }
  }

  /**
   * Calculates the expiry date for a refresh token
   * @returns {Date} Expiry date for the refresh token
   * @throws {AppError} If calculation fails
   */
  static getRefreshTokenExpiryDate(): Date {
    try {
      const days = 7; // Hard-code to 7 days to match REFRESH_TOKEN_EXPIRES_IN
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw createError.internal(
        `Failed to calculate refresh token expiry: ${errorMessage}`,
        'REFRESH_TOKEN_EXPIRY_CALCULATION_FAILED'
      );
    }
  }
} 