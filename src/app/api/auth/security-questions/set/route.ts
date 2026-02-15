import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { AccountRecoveryService } from '@/lib/services/account-recovery-service';
import { authService } from '@/lib/services/auth-service';
import { extractRequestMetadata } from '@/app/api/auth/_helpers';
import { z } from 'zod';

const setQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().min(5, 'السؤال يجب أن يكون 5 أحرف على الأقل'),
      answer: z.string().min(2, 'الإجابة يجب أن تكون حرفين على الأقل'),
    })
  ).min(1).max(3),
});

export async function POST(request: NextRequest) {
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

      // Parse and validate request body
      const body = await req.json();
      const parsed = setQuestionsSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'بيانات غير صالحة',
            code: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      // Set security questions
      const result = await AccountRecoveryService.setSecurityQuestions(
        userId,
        parsed.data.questions
      );

      if (!result.success) {
        await authService.logSecurityEvent(userId, 'security_questions_set_failed', ip, {
          userAgent,
          reason: result.message,
        });

        return NextResponse.json(
          {
            error: result.message,
            code: 'SET_QUESTIONS_FAILED',
          },
          { status: 400 }
        );
      }

      // Log success
      await authService.logSecurityEvent(userId, 'security_questions_set', ip, {
        userAgent,
        questionCount: parsed.data.questions.length,
      });

      return NextResponse.json({
        message: result.message,
      });

    } catch (error) {
      logger.error('Error setting security questions:', error);

      await authService.logSecurityEvent('unknown', 'security_questions_set_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch(() => { });

      return NextResponse.json(
        {
          error: 'حدث خطأ أثناء حفظ أسئلة الأمان',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  });
}

