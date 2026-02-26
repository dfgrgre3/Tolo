/**
 * Magic Link Authentication Service
 * ط®ط¯ظ…ط© طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¨ط¯ظˆظ† ظƒظ„ظ…ط© ظ…ط±ظˆط± ط¹ط¨ط± ط±ط§ط¨ط· ط³ط­ط±ظٹ
 */

import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendEmailNotification } from '@/lib/notification-sender';
import { securityLogger } from '@/lib/security-logger';
import { logger } from '@/lib/logger';

const MAGIC_LINK_EXPIRY_MINUTES = 15; // 15 minutes

/**
 * Generate a magic link token
 */
export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create and send magic link
 */
export async function createAndSendMagicLink(
  email: string,
  ip: string,
  userAgent: string
): Promise<{ success: boolean; expiresIn?: number }> {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) {
      // Don't reveal if user exists - security best practice
      // Still return success to prevent email enumeration
      return { success: true };
    }

    // Generate token
    const token = generateMagicLinkToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

    // Store token in database (create or update)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token, // Reuse resetToken field for magic link
        resetTokenExpires: expiresAt,
      },
    });

    // Generate magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const magicLink = `${baseUrl}/auth/magic-link?token=${token}&email=${encodeURIComponent(user.email)}`;

    // Send email
    await sendEmailNotification({
      to: user.email,
      subject: 'ًں”— ط±ط§ط¨ط· طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط§ظ„ط³ط­ط±ظٹ',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #3b82f6; margin: 0;">ط«ظ†ط§ظˆظٹ</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 10px;">طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ط¨ط¯ظˆظ† ظƒظ„ظ…ط© ظ…ط±ظˆط±</h2>
            <p style="color: #4b5563; margin: 0; line-height: 1.6;">
              ط§ظ†ظ‚ط± ط¹ظ„ظ‰ ط§ظ„ط±ط§ط¨ط· ط£ط¯ظ†ط§ظ‡ ظ„طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¥ظ„ظ‰ ط­ط³ط§ط¨ظƒ ط¨ط¯ظˆظ† ط¥ط¯ط®ط§ظ„ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
              طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„
            </a>
          </div>
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-right: 4px solid #f59e0b;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>âڑ ï¸ڈ طھظ†ط¨ظٹظ‡ ط£ظ…ظ†ظٹ:</strong>
            </p>
            <ul style="color: #92400e; margin: 8px 0 0 0; padding-right: 20px; font-size: 13px;">
              <li>ظ‡ط°ط§ ط§ظ„ط±ط§ط¨ط· طµط§ظ„ط­ ظ„ظ…ط¯ط© ${MAGIC_LINK_EXPIRY_MINUTES} ط¯ظ‚ط§ط¦ظ‚ ظپظ‚ط·</li>
              <li>ظ„ط§ طھط´ط§ط±ظƒ ظ‡ط°ط§ ط§ظ„ط±ط§ط¨ط· ظ…ط¹ ط£ظٹ ط´ط®طµ</li>
              <li>ط¥ط°ط§ ظ„ظ… طھط·ظ„ط¨ ظ‡ط°ط§ ط§ظ„ط±ط§ط¨ط·طŒ ظٹظ…ظƒظ†ظƒ طھط¬ط§ظ‡ظ„ ظ‡ط°ط§ ط§ظ„ط¨ط±ظٹط¯</li>
            </ul>
          </div>
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>طھظ… ط¥ط±ط³ط§ظ„ ظ‡ط°ظ‡ ط§ظ„ط±ط³ط§ظ„ط© ظ…ظ† ظ…ظ†طµط© ط«ظ†ط§ظˆظٹ ط§ظ„طھط¹ظ„ظٹظ…ظٹط©</p>
            <p>آ© ${new Date().getFullYear()} ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ‚ ظ…ط­ظپظˆط¸ط©</p>
          </div>
        </div>
      `,
      text: `طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ط¨ط¯ظˆظ† ظƒظ„ظ…ط© ظ…ط±ظˆط±\n\nط§ظ†ظ‚ط± ط¹ظ„ظ‰ ط§ظ„ط±ط§ط¨ط· ط§ظ„طھط§ظ„ظٹ ظ„طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„:\n${magicLink}\n\nظ‡ط°ط§ ط§ظ„ط±ط§ط¨ط· طµط§ظ„ط­ ظ„ظ…ط¯ط© ${MAGIC_LINK_EXPIRY_MINUTES} ط¯ظ‚ط§ط¦ظ‚ ظپظ‚ط·.\n\nط¥ط°ط§ ظ„ظ… طھط·ظ„ط¨ ظ‡ط°ط§ ط§ظ„ط±ط§ط¨ط·طŒ ظٹظ…ظƒظ†ظƒ طھط¬ط§ظ‡ظ„ ظ‡ط°ط§ ط§ظ„ط¨ط±ظٹط¯.`,
    });

    // Log event
    await securityLogger.logEvent({
      userId: user.id,
      eventType: 'MAGIC_LINK_SENT' as const,
      ip,
      userAgent,
    });

    return {
      success: true,
      expiresIn: MAGIC_LINK_EXPIRY_MINUTES * 60, // in seconds
    };
  } catch (error) {
    logger.error('Magic link creation error:', error);
    throw error;
  }
}

/**
 * Verify magic link token and login user
 */
export async function verifyMagicLink(
  token: string,
  email: string,
  ip: string,
  userAgent: string
): Promise<{
  valid: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  error?: string;
}> {
  try {
    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        resetToken: token,
        resetTokenExpires: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return {
        valid: false,
        error: 'ط§ظ„ط±ط§ط¨ط· ط؛ظٹط± طµط§ظ„ط­ ط£ظˆ ظ…ظ†طھظ‡ظٹ ط§ظ„طµظ„ط§ط­ظٹط©',
      };
    }

    // Clear token (one-time use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    // Log event
    await securityLogger.logEvent({
      userId: user.id,
      eventType: 'MAGIC_LINK_USED' as const,
      ip,
      userAgent,
    });

    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
      },
    };
  } catch (error) {
    logger.error('Magic link verification error:', error);
    return {
      valid: false,
      error: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط±ط§ط¨ط·',
    };
  }
}

/**
 * Check if magic link token is valid (without consuming it)
 */
export async function checkMagicLinkValidity(
  token: string,
  email: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        resetToken: token,
        resetTokenExpires: {
          gte: new Date(),
        },
      },
      select: { id: true },
    });

    return !!user;
  } catch {
    return false;
  }
}

