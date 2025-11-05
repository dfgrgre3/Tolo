import { NextRequest, NextResponse } from 'next/server';
import { verifyTOTPLogin, verifyTOTP } from '@/lib/two-factor/totp-service';
import { verifyAndConsumeRecoveryCode } from '@/lib/two-factor/recovery-codes';
import { prisma } from '@/lib/prisma';
import { authService } from '@/lib/auth-service';

/**
 * POST /api/auth/two-factor/totp/verify-login
 * التحقق من رمز TOTP أثناء تسجيل الدخول
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code, useRecoveryCode } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID مطلوب' },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'رمز التحقق مطلوب' },
        { status: 400 }
      );
    }

    // Check if user exists and has 2FA enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'المصادقة الثنائية غير مفعلة لهذا الحساب' },
        { status: 400 }
      );
    }

    let isValid = false;

    if (useRecoveryCode) {
      // Verify recovery code
      isValid = await verifyAndConsumeRecoveryCode(userId, code);
    } else {
      // Verify TOTP code
      if (!user.twoFactorSecret) {
        return NextResponse.json(
          { error: 'المصادقة الثنائية غير مفعلة' },
          { status: 400 }
        );
      }
      isValid = verifyTOTP(user.twoFactorSecret, code);
    }

    // Get IP and User Agent for logging
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);

    if (!isValid) {
      // Log failed verification attempt
      await authService.logSecurityEvent(user.id, 'two_factor_verification_failed', ip, {
        userAgent,
        method: useRecoveryCode ? 'recovery_code' : 'totp',
      }).catch(() => {
        // Non-blocking log failure
      });

      return NextResponse.json(
        { error: useRecoveryCode ? 'رمز الاسترداد غير صحيح' : 'رمز التحقق غير صحيح' },
        { status: 401 }
      );
    }

    // Log successful verification
    await authService.logSecurityEvent(user.id, 'two_factor_verification_success', ip, {
      userAgent,
      method: useRecoveryCode ? 'recovery_code' : 'totp',
    }).catch(() => {
      // Non-blocking log failure
    });

    return NextResponse.json({
      valid: true,
      message: 'تم التحقق بنجاح',
    });
  } catch (error) {
    console.error('TOTP login verify error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحقق' },
      { status: 500 }
    );
  }
}

