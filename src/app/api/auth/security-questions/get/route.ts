import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { AccountRecoveryService } from '@/lib/services/account-recovery-service';
import { authService } from '@/lib/services/auth-service';
import { extractRequestMetadata } from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent } = extractRequestMetadata(req);

    try {
      // Verify authentication
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'غير مصرح', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const verification = await authService.verifyTokenFromInput(token);

      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { error: 'رمز غير صالح', code: 'INVALID_TOKEN' },
          { status: 401 }
        );
      }

      const userId = verification.user!.userId;

      // Get security questions
      const result = await AccountRecoveryService.getSecurityQuestions(userId);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.message || 'فشل جلب أسئلة الأمان',
            code: 'GET_QUESTIONS_FAILED',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        questions: result.questions || [],
      });

    } catch (error) {
      logger.error('Error getting security questions:', error);

      await authService.logSecurityEvent('unknown', 'security_questions_get_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch(() => { });

      return NextResponse.json(
        {
          error: 'حدث خطأ أثناء جلب أسئلة الأمان',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  });
}

