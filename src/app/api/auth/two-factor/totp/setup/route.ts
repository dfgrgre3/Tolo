import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { securityLogger } from '@/lib/security-logger';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/two-factor/totp/setup
 * إعداد TOTP للمستخدم
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // التحقق من التوكن
      const verification = await authService.verifyTokenFromRequest(req);

      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { error: 'رمز غير صالح' },
          { status: 401 }
        );
      }

      // Setup TOTP
      const { secret, qrCodeUrl } = await authService.generateTwoFactorSecret(
        verification.user.id,
        verification.user.email
      );

      // Log event
      const ip = authService.getClientIP(req);
      const userAgent = authService.getUserAgent(req);
      await securityLogger.logEvent({
        userId: verification.user.id,
        eventType: 'TWO_FACTOR_SETUP',
        ip,
        userAgent,
        metadata: { method: 'TOTP' },
      });

      // Format secret for manual entry (with spaces every 4 chars)
      const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;

      return NextResponse.json({
        secret, // For QR code generation on frontend
        qrCodeURL: qrCodeUrl, // otpauth URL
        manualEntryKey, // For manual entry
        message: 'تم إعداد المصادقة الثنائية. يرجى التحقق باستخدام تطبيق المصادقة.',
      });
    } catch (error) {
      logger.error('TOTP setup error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ أثناء إعداد المصادقة الثنائية' },
        { status: 500 }
      );
    }
  });
}
