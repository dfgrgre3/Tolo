import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { setupTOTP } from '@/lib/two-factor/totp-service';
import { generateAndStoreRecoveryCodes } from '@/lib/two-factor/recovery-codes';
import { securityLogger } from '@/lib/security-logger';

/**
 * POST /api/auth/two-factor/totp/setup
 * إعداد TOTP للمستخدم
 */
export async function POST(request: NextRequest) {
  try {
    // التحقق من التوكن
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = await authService.verifyToken(token);

    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'رمز غير صالح' },
        { status: 401 }
      );
    }

    // Setup TOTP
    const { secret, qrCodeURL, manualEntryKey } = await setupTOTP(
      verification.user.id
    );

    // Generate recovery codes
    const recoveryCodes = await generateAndStoreRecoveryCodes(
      verification.user.id,
      10
    );

    // Log event
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);
    await securityLogger.logEvent({
      userId: verification.user.id,
      eventType: 'TWO_FACTOR_SETUP',
      ip,
      userAgent,
      metadata: { method: 'TOTP' },
    });

    return NextResponse.json({
      secret, // For QR code generation on frontend
      qrCodeURL, // otpauth URL
      manualEntryKey, // For manual entry
      recoveryCodes, // Show these to user once!
      message: 'تم إعداد المصادقة الثنائية. يرجى التحقق باستخدام تطبيق المصادقة.',
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إعداد المصادقة الثنائية' },
      { status: 500 }
    );
  }
}

