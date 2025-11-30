import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { securityLogger } from '@/lib/security-logger';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * GET /api/auth/two-factor/recovery-codes
 * الحصول على عدد رموز الاسترداد المتبقية
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const verification = await authService.verifyTokenFromRequest(req);

      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { error: 'رمز غير صالح' },
          { status: 401 }
        );
      }

      const count = await authService.getRemainingRecoveryCodesCount(verification.user.id);

      return NextResponse.json({
        count,
      });
    } catch (error) {
      logger.error('Recovery codes count error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ أثناء جلب عدد رموز الاسترداد' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/auth/two-factor/recovery-codes
 * إعادة توليد رموز الاسترداد
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const verification = await authService.verifyTokenFromRequest(req);

      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { error: 'رمز غير صالح' },
          { status: 401 }
        );
      }

      const body = await req.json();
      const { count = 10 } = body;

      // Regenerate recovery codes
      const codes = await authService.regenerateRecoveryCodes(
        verification.user.id,
        count
      );

      // Log event
      const ip = authService.getClientIP(req);
      const userAgent = authService.getUserAgent(req);
      await Promise.all([
        authService.logSecurityEvent(verification.user.id, 'recovery_codes_regenerated', ip, {
          userAgent,
          count,
        }),
        securityLogger.logEvent({
          userId: verification.user.id,
          eventType: 'RECOVERY_CODES_REGENERATED',
          ip,
          userAgent,
          metadata: { count },
        }),
      ]).catch(() => {
        // Non-blocking log failure
      });

      return NextResponse.json({
        codes, // Show these to user once!
        message: 'تم توليد رموز استرداد جديدة. احفظها في مكان آمن.',
        warning: 'هذه الرموز لن تظهر مرة أخرى. احفظها الآن!',
      });
    } catch (error) {
      logger.error('Recovery codes regenerate error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ أثناء توليد رموز الاسترداد' },
        { status: 500 }
      );
    }
  });
}
