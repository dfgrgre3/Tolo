import { prisma } from '@/lib/db';
import { sendSMSNotification } from '@/lib/notification-sender-new';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * ط®ط¯ظ…ط© ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط¹ط¨ط± OTP
 */
export class PhoneVerificationService {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly MAX_ATTEMPTS = 5; // Maximum verification attempts
  private static readonly RESEND_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes between resends

  /**
   * Generate a random OTP code
   */
  private static generateOTP(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Hash OTP for secure storage
   */
  private static hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Verify OTP
   */
  private static verifyOTP(inputOTP: string, hashedOTP: string): boolean {
    const inputHash = this.hashOTP(inputOTP);
    return crypto.timingSafeEqual(
      Buffer.from(inputHash),
      Buffer.from(hashedOTP)
    );
  }

  /**
   * Send OTP to phone number
   */
  static async sendOTP(userId: string, phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    expiresIn?: number;
    canResendAfter?: number;
    otp?: string;
  }> {
    try {
      // Validate phone number format
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      if (!normalizedPhone) {
        return {
          success: false,
          message: 'ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط؛ظٹط± طµط§ظ„ط­',
        };
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          phoneVerified: true,
          phoneVerificationOTP: true,
          phoneVerificationExpires: true,
          phoneVerificationAttempts: true,
          phoneVerificationLastSent: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯',
        };
      }

      // Check if phone is already verified
      if (user.phoneVerified && user.phone === normalizedPhone) {
        return {
          success: false,
          message: 'ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ظ…ظپط¹ظ‘ظ„ ط¨ط§ظ„ظپط¹ظ„',
        };
      }

      // Check resend cooldown
      if (user.phoneVerificationLastSent) {
        const timeSinceLastSend = Date.now() - user.phoneVerificationLastSent.getTime();
        if (timeSinceLastSend < this.RESEND_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((this.RESEND_COOLDOWN_MS - timeSinceLastSend) / 1000);
          return {
            success: false,
            message: `ظٹط±ط¬ظ‰ ط§ظ„ط§ظ†طھط¸ط§ط± ${remainingSeconds} ط«ط§ظ†ظٹط© ظ‚ط¨ظ„ ط¥ط¹ط§ط¯ط© ط§ظ„ط¥ط±ط³ط§ظ„`,
            canResendAfter: this.RESEND_COOLDOWN_MS - timeSinceLastSend,
          };
        }
      }

      // Generate OTP
      const otp = this.generateOTP();
      const hashedOTP = this.hashOTP(otp);
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MS);

      // Update user with OTP
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: normalizedPhone,
          phoneVerificationOTP: hashedOTP,
          phoneVerificationExpires: expiresAt,
          phoneVerificationAttempts: 0,
          phoneVerificationLastSent: new Date(),
          phoneVerified: false, // Reset verification status if phone changed
        },
      });

      // Send SMS
      const smsBody = `ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ظپظٹ ظ…ظ†طµط© ط«ظ†ط§ظˆظٹ: ${otp}\n\nطµظ„ط§ط­ظٹط© ط§ظ„ط±ظ…ط² 10 ط¯ظ‚ط§ط¦ظ‚.`;
      const smsResult = await sendSMSNotification({
        to: normalizedPhone,
        body: smsBody,
      });

      if (!smsResult.success) {
        logger.error('Failed to send SMS OTP:', smsResult);
        // Don't fail the request if SMS fails in development
        if (process.env.NODE_ENV === 'production') {
          return {
            success: false,
            message: 'ظپط´ظ„ ط¥ط±ط³ط§ظ„ ط§ظ„ط±ط³ط§ظ„ط© ط§ظ„ظ†طµظٹط©. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
          };
        }
      }

      logger.info(`OTP sent to phone ${normalizedPhone} for user ${userId}`);

      return {
        success: true,
        message: 'طھظ… ط¥ط±ط³ط§ظ„ ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ط¨ظ†ط¬ط§ط­',
        expiresIn: this.OTP_EXPIRY_MS / 1000, // in seconds
        canResendAfter: this.RESEND_COOLDOWN_MS,
        // In development, return OTP for testing
        ...(process.env.NODE_ENV === 'development' && { otp }),
      };
    } catch (error) {
      logger.error('Error sending phone verification OTP:', error);
      return {
        success: false,
        message: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط¥ط±ط³ط§ظ„ ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚',
      };
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyOTPCode(
    userId: string,
    otp: string
  ): Promise<{
    success: boolean;
    message: string;
    verified?: boolean;
  }> {
    try {
      // Validate OTP format
      if (!otp || otp.length !== this.OTP_LENGTH || !/^\d+$/.test(otp)) {
        return {
          success: false,
          message: 'ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† 6 ط£ط±ظ‚ط§ظ…',
        };
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          phoneVerified: true,
          phoneVerificationOTP: true,
          phoneVerificationExpires: true,
          phoneVerificationAttempts: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯',
        };
      }

      // Check if already verified
      if (user.phoneVerified) {
        return {
          success: true,
          message: 'ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ظ…ظپط¹ظ‘ظ„ ط¨ط§ظ„ظپط¹ظ„',
          verified: true,
        };
      }

      // Check if OTP exists
      if (!user.phoneVerificationOTP || !user.phoneVerificationExpires) {
        return {
          success: false,
          message: 'ظ„ظ… ظٹطھظ… ط¥ط±ط³ط§ظ„ ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚. ظٹط±ط¬ظ‰ ط·ظ„ط¨ ط±ظ…ط² ط¬ط¯ظٹط¯',
        };
      }

      // Check if OTP expired
      if (user.phoneVerificationExpires.getTime() < Date.now()) {
        return {
          success: false,
          message: 'ط§ظ†طھظ‡طھ طµظ„ط§ط­ظٹط© ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚. ظٹط±ط¬ظ‰ ط·ظ„ط¨ ط±ظ…ط² ط¬ط¯ظٹط¯',
        };
      }

      // Check attempts
      const attempts = user.phoneVerificationAttempts || 0;
      if (attempts >= this.MAX_ATTEMPTS) {
        return {
          success: false,
          message: 'طھظ… طھط¬ط§ظˆط² ط¹ط¯ط¯ ط§ظ„ظ…ط­ط§ظˆظ„ط§طھ ط§ظ„ظ…ط³ظ…ظˆط­ ط¨ظ‡ط§. ظٹط±ط¬ظ‰ ط·ظ„ط¨ ط±ظ…ط² ط¬ط¯ظٹط¯',
        };
      }

      // Verify OTP
      const isValid = this.verifyOTP(otp, user.phoneVerificationOTP);

      if (!isValid) {
        // Increment attempts
        await prisma.user.update({
          where: { id: userId },
          data: {
            phoneVerificationAttempts: attempts + 1,
          },
        });

        const remainingAttempts = this.MAX_ATTEMPTS - (attempts + 1);
        return {
          success: false,
          message: `ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ط؛ظٹط± طµط­ظٹط­. ظ…ط­ط§ظˆظ„ط§طھ ظ…طھط¨ظ‚ظٹط©: ${remainingAttempts}`,
        };
      }

      // Mark phone as verified
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerified: true,
          phoneVerificationOTP: null,
          phoneVerificationExpires: null,
          phoneVerificationAttempts: 0,
        },
      });

      logger.info(`Phone verified for user ${userId}: ${user.phone}`);

      return {
        success: true,
        message: 'طھظ… ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط¨ظ†ط¬ط§ط­',
        verified: true,
      };
    } catch (error) {
      logger.error('Error verifying phone OTP:', error);
      return {
        success: false,
        message: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط±ظ…ط²',
      };
    }
  }

  /**
   * Normalize phone number (basic validation and formatting)
   */
  private static normalizePhoneNumber(phone: string): string | null {
    if (!phone) return null;

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Basic validation - should have at least 10 digits
    const digitsOnly = cleaned.replace(/\+/g, '');
    if (digitsOnly.length < 10) {
      return null;
    }

    // If starts with +, keep it, otherwise add country code if needed
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // If starts with 0, replace with country code (assume Saudi Arabia +966)
    if (cleaned.startsWith('0')) {
      return `+966${cleaned.substring(1)}`;
    }

    // If doesn't start with country code, assume Saudi Arabia
    if (!cleaned.startsWith('966')) {
      return `+966${cleaned}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Resend OTP (with cooldown check)
   */
  static async resendOTP(userId: string): Promise<{
    success: boolean;
    message: string;
    expiresIn?: number;
    canResendAfter?: number;
    otp?: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
      },
    });

    if (!user || !user.phone) {
      return {
        success: false,
        message: 'ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط؛ظٹط± ظ…ط³ط¬ظ„',
      };
    }

    return this.sendOTP(userId, user.phone);
  }
}

