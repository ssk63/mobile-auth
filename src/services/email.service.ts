import nodemailer from 'nodemailer';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { verificationCodes } from '../db/schema';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // For development, you can use ethereal.email
    // For production, replace with real SMTP credentials
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Generates a random 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

    // Send the email
    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Auth Service" <sskdsmn8@gmail.com>',
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${code}\nThis code will expire in 15 minutes.`,
      html: `
        <h2>Your Verification Code</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code will expire in 15 minutes.</p>
      `,
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
} 