/**
 * Magic Link Authentication Service
 * خدمة تسجيل الدخول بدون كلمة مرور عبر رابط سحري
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmailNotification } from '@/lib/notification-sender-new';
import { securityLogger } from '@/lib/security-logger';

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
      subject: '🔗 رابط تسجيل الدخول السحري',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #3b82f6; margin: 0;">ثناوي</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 10px;">تسجيل دخول بدون كلمة مرور</h2>
            <p style="color: #4b5563; margin: 0; line-height: 1.6;">
              انقر على الرابط أدناه لتسجيل الدخول إلى حسابك بدون إدخال كلمة المرور.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
              تسجيل الدخول
            </a>
          </div>
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-right: 4px solid #f59e0b;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>⚠️ تنبيه أمني:</strong>
            </p>
            <ul style="color: #92400e; margin: 8px 0 0 0; padding-right: 20px; font-size: 13px;">
              <li>هذا الرابط صالح لمدة ${MAGIC_LINK_EXPIRY_MINUTES} دقائق فقط</li>
              <li>لا تشارك هذا الرابط مع أي شخص</li>
              <li>إذا لم تطلب هذا الرابط، يمكنك تجاهل هذا البريد</li>
            </ul>
          </div>
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>تم إرسال هذه الرسالة من منصة ثناوي التعليمية</p>
            <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
          </div>
        </div>
      `,
      text: `تسجيل دخول بدون كلمة مرور\n\nانقر على الرابط التالي لتسجيل الدخول:\n${magicLink}\n\nهذا الرابط صالح لمدة ${MAGIC_LINK_EXPIRY_MINUTES} دقائق فقط.\n\nإذا لم تطلب هذا الرابط، يمكنك تجاهل هذا البريد.`,
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
    console.error('Magic link creation error:', error);
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
        error: 'الرابط غير صالح أو منتهي الصلاحية',
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
    console.error('Magic link verification error:', error);
    return {
      valid: false,
      error: 'حدث خطأ أثناء التحقق من الرابط',
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

