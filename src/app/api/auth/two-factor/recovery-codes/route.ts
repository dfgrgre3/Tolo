import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import {
  getRemainingRecoveryCodesCount,
  regenerateRecoveryCodes,
} from '@/lib/two-factor/recovery-codes';
import { securityLogger } from '@/lib/security-logger';

/**
 * GET /api/auth/two-factor/recovery-codes
 * الحصول على عدد رموز الاسترداد المتبقية
 */
export async function GET(request: NextRequest) {
  try {
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

    const count = await getRemainingRecoveryCodesCount(verification.user.id);

    return NextResponse.json({
      count,
    });
  } catch (error) {
    console.error('Recovery codes count error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب عدد رموز الاسترداد' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/two-factor/recovery-codes
 * إعادة توليد رموز الاسترداد
 */
export async function POST(request: NextRequest) {
  try {
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
    const { count = 10 } = body;

    // Regenerate recovery codes
    const codes = await regenerateRecoveryCodes(
      verification.user.id,
      count
    );

    // Log event
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);
    await securityLogger.logEvent({
      userId: verification.user.id,
      eventType: 'RECOVERY_CODES_REGENERATED',
      ip,
      userAgent,
    });

    return NextResponse.json({
      codes, // Show these to user once!
      message: 'تم توليد رموز استرداد جديدة. احفظها في مكان آمن.',
      warning: 'هذه الرموز لن تظهر مرة أخرى. احفظها الآن!',
    });
  } catch (error) {
    console.error('Recovery codes regenerate error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء توليد رموز الاسترداد' },
      { status: 500 }
    );
  }
}

