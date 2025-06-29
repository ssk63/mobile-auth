import nodemailer from 'nodemailer';
import { eq, and, gt, lt } from 'drizzle-orm';
import { randomInt } from 'crypto';
import { db } from '../db';
import { verificationCodes } from '../db/schema';

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  email_from: string;
  email_domain: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly companyName = process.env.COMPANY_NAME || 'DSMN8';
  private readonly companyLogo = process.env.COMPANY_LOGO || 'https://dsmn8.imgix.net/ugc/fc51444137e0e36236f42c58f405a626/9203487824831139397706358/source.jpg?w=500&fit=crop';
  private readonly primaryColor = process.env.EMAIL_PRIMARY_COLOR || '#FF4500'; // DSMN8 Orange
  private readonly supportEmail = process.env.SUPPORT_EMAIL || 'support@dsmn8.com';

  constructor() {
    // Validate and parse email configuration
    const config = this.validateEmailConfig();

    // Initialize nodemailer transporter with validated config
    this.transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
      },
    });
  }

  /**
   * Validates and returns email configuration
   * @throws {Error} If required configuration is missing or invalid
   */
  private validateEmailConfig(): EmailConfig {
    const missingVars: string[] = [];
    const config = {
      smtp_host: process.env.SMTP_HOST,
      smtp_port: process.env.SMTP_PORT,
      smtp_user: process.env.SMTP_USER,
      smtp_pass: process.env.SMTP_PASS,
      smtp_secure: process.env.SMTP_SECURE,
      email_from: process.env.EMAIL_FROM,
      email_domain: process.env.EMAIL_DOMAIN,
    };

    // Check required variables
    if (!config.smtp_host) missingVars.push('SMTP_HOST');
    if (!config.smtp_port) missingVars.push('SMTP_PORT');
    if (!config.smtp_user) missingVars.push('SMTP_USER');
    if (!config.smtp_pass) missingVars.push('SMTP_PASS');
    
    // Throw error if any required variables are missing
    if (missingVars.length > 0) {
      throw new Error(
        `Email service configuration missing required variables: ${missingVars.join(', ')}`
      );
    }

    // Validate port number
    const port = parseInt(config.smtp_port as string, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(
        `Invalid SMTP_PORT: ${config.smtp_port}. Must be a number between 1 and 65535`
      );
    }

    // Return validated config with defaults for optional values
    return {
      smtp_host: config.smtp_host as string,
      smtp_port: port,
      smtp_user: config.smtp_user as string,
      smtp_pass: config.smtp_pass as string,
      smtp_secure: config.smtp_secure === 'true',
      email_from: config.email_from || `"${this.companyName}" <noreply@${config.email_domain || 'dsmn8.com'}>`,
      email_domain: config.email_domain || 'dsmn8.com'
    };
  }

  /**
   * Generates a cryptographically secure 6-digit verification code
   * Uses Node's crypto.randomInt for better security than Math.random()
   * @returns {string} A 6-digit verification code
   */
  private generateVerificationCode(): string {
    // Generate a number between 100000 and 999999 (inclusive)
    // This ensures the code is always exactly 6 digits
    return randomInt(100000, 1000000).toString();
  }

  /**
   * Generates the HTML email template for verification code
   */
  private generateEmailTemplate(code: string): { html: string; text: string } {
    const text = `
Your Verification Code: ${code}

This code will expire in 15 minutes.

Security Notice:
- This code was requested from the DSMN8 mobile app
- Never share this code with anyone
- Our support team will never ask for this code
- If you didn't request this code, please ignore this email

Need help? Contact us at ${this.supportEmail}

DSMN8
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 620px) {
      .wrapper {
        width: 100% !important;
        padding: 0 !important;
      }
      .content {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6; font-family: Arial, sans-serif;">
  <div class="wrapper" style="width: 100%; max-width: 620px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Logo -->
    <div style="text-align: center; padding: 20px; background-color: #ffffff;">
      <img src="${this.companyLogo}" alt="${this.companyName}" style="max-width: 200px; height: auto;">
    </div>
    
    <!-- Main Content -->
    <div class="content" style="padding: 40px; background-color: #ffffff;">
      <h1 style="color: #333333; font-size: 24px; margin: 0 0 20px;">Verify Your Email</h1>
      
      <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">
        Please use the following verification code to complete your authentication:
      </p>
      
      <!-- Verification Code Box -->
      <div style="background-color: #f8f8f8; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: ${this.primaryColor};">${code}</span>
        <p style="color: #999999; font-size: 14px; margin: 10px 0 0;">This code will expire in 15 minutes</p>
      </div>

      <!-- Security Notice -->
      <div style="border-left: 4px solid ${this.primaryColor}; padding-left: 20px; margin: 30px 0;">
        <h2 style="color: #333333; font-size: 18px; margin: 0 0 10px;">Security Notice</h2>
        <ul style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">
          <li>This code was requested from the ${this.companyName} mobile app</li>
          <li>Never share this code with anyone</li>
          <li>Our support team will never ask for this code</li>
          <li>If you didn't request this code, please ignore this email</li>
        </ul>
      </div>

      <!-- Help Section -->
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee;">
        <p style="color: #999999; font-size: 14px;">
          Need help? <a href="mailto:${this.supportEmail}" style="color: ${this.primaryColor}; text-decoration: none;">Contact our support team</a>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px; background-color: #f8f8f8;">
      <p style="color: #999999; font-size: 12px; margin: 0;">
        &copy; ${new Date().getFullYear()} ${this.companyName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    return { html, text };
  }

  /**
   * Sends a verification code to the specified email
   */
  async sendVerificationCode(email: string): Promise<string> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Save the code to the database
    await db.insert(verificationCodes).values({
      email,
      code,
      expiresAt,
    });

    const { html, text } = this.generateEmailTemplate(code);

    // Send the email
    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || `"${this.companyName}" <noreply@${process.env.EMAIL_DOMAIN || 'dsmn8.com'}>`,
      to: email,
      subject: `Your ${this.companyName} Verification Code`,
      text,
      html,
    });

    return code;
  }

  /**
   * Verifies a code for a given email
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    const now = new Date();

    const result = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.email, email),
          eq(verificationCodes.code, code),
          eq(verificationCodes.used, false),
          gt(verificationCodes.expiresAt, now)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    // Mark the code as used
    await db
      .update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.id, result[0].id));

    return true;
  }

  /**
   * Cleans up expired verification codes from the database
   * This includes both used and unused codes that have expired
   */
  async cleanupExpiredCodes(): Promise<void> {
    try {
      const now = new Date();
      await db
        .delete(verificationCodes)
        .where(lt(verificationCodes.expiresAt, now));
    } catch (error) {
      console.error('Error cleaning up expired verification codes:', error);
    }
  }

  /**
   * Starts the automatic cleanup of expired verification codes
   * @param intervalMinutes How often to run the cleanup (in minutes)
   */
  startCleanupSchedule(intervalMinutes: number = 60): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup immediately
    this.cleanupExpiredCodes().catch(console.error);

    // Schedule regular cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCodes().catch(console.error);
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stops the automatic cleanup of expired verification codes
   */
  stopCleanupSchedule(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
} 