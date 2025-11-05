import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { verifyAndEnableTOTP } from '@/lib/two-factor/totp-service';
import { securityLogger } from '@/lib/security-logger';
import { securityNotificationService } from '@/lib/security/security-notifications';

/**
 * POST /api/auth/two-factor/totp/verify
 * التحقق من رمز TOTP وتمكين المصادقة الثنائية
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

    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'يرجى إدخال رمز صحيح مكون من 6 أرقام' },
        { status: 400 }
      );
    }

    // Verify and enable TOTP
    const isValid = await verifyAndEnableTOTP(
      verification.user.id,
      code
    );

    // Get IP and User Agent for logging
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);

    if (!isValid) {
      // Log failed verification attempt
      await authService.logSecurityEvent(verification.user.id, 'two_factor_verify_failed', ip, {
        userAgent,
        method: 'TOTP',
      }).catch(() => {
        // Non-blocking log failure
      });

      return NextResponse.json(
        { error: 'رمز التحقق غير صحيح' },
        { status: 400 }
      );
    }

    // Log event and send notification
    await Promise.all([
      securityLogger.logEvent({
        userId: verification.user.id,
        eventType: 'TWO_FACTOR_ENABLED',
        ip,
        userAgent,
        metadata: { method: 'TOTP' },
      }),
      authService.logSecurityEvent(verification.user.id, 'two_factor_enabled', ip, {
        userAgent,
        method: 'TOTP',
      }),
    ]).catch(() => {
      // Non-blocking log failure
    });

    await securityNotificationService.notify2FAStatusChange(
      verification.user.id,
      true,
      ip
    ).catch(() => {
      // Non-blocking notification failure
    });

    return NextResponse.json({
      message: 'تم تفعيل المصادقة الثنائية بنجاح',
    });
  } catch (error) {
    console.error('TOTP verify error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحقق من المصادقة الثنائية' },
      { status: 500 }
    );
  }
}

