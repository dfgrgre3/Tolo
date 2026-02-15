import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { AccountRecoveryService } from '@/lib/services/account-recovery-service';
import { authService } from '@/lib/services/auth-service';
import { extractRequestMetadata } from '@/app/api/auth/_helpers';
import { z } from 'zod';

const initiateRecoverySchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  method: z.enum(['email', 'phone', 'questions', 'multi']).default('multi'),
});

const completeRecoverySchema = z.object({
  recoveryToken: z.string().min(1, 'رمز الاسترداد مطلوب'),
  newPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  verifications: z.object({
    emailCode: z.string().optional(),
    phoneOTP: z.string().optional(),
    securityAnswers: z.array(
      z.object({
        questionId: z.string(),
        answer: z.string(),
      })
    ).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent, clientId } = extractRequestMetadata(req);

    try {
      // Rate limiting check
      try {
        const { RateLimitingService } = await import('@/lib/services/rate-limiting-service');
        const { getRedisClient } = await import('@/lib/redis');

        const redis = await getRedisClient();
        const rateLimitService = new RateLimitingService(redis);
        const rateLimitStatus = await rateLimitService.checkRateLimit(
          `account-recovery:${clientId}`,
          {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxAttempts: 3, // 3 attempts per 15 minutes
            lockoutMs: 30 * 60 * 1000, // 30 minutes lockout
          }
        );

        if (!rateLimitStatus.allowed) {
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil((rateLimitStatus.remainingTime || 900) / 60)
          );

          await authService.logSecurityEvent('unknown', 'account_recovery_rate_limited', ip, {
            userAgent,
            attempts: rateLimitStatus.attempts,
            retryAfterSeconds,
          });

          return NextResponse.json(
            {
              error: 'تم تعليق محاولات الاسترداد مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.',
              code: 'RATE_LIMITED',
              retryAfterSeconds,
            },
            { status: 429 }
          );
        }
      } catch (redisError) {
        logger.warn('Redis unavailable for rate limiting:', redisError);
      }

      const body = await req.json();
      const action = body.action as 'initiate' | 'complete';

      if (action === 'initiate') {
        // Initiate recovery
        const parsed = initiateRecoverySchema.safeParse(body);

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

        const result = await AccountRecoveryService.initiateRecovery(
          parsed.data.email,
          parsed.data.method
        );

        if (!result.success) {
          await authService.logSecurityEvent('unknown', 'account_recovery_initiate_failed', ip, {
            userAgent,
            email: parsed.data.email,
            method: parsed.data.method,
          });

          return NextResponse.json(
            {
              error: result.message,
              code: 'RECOVERY_INITIATE_FAILED',
            },
            { status: 400 }
          );
        }

        await authService.logSecurityEvent('unknown', 'account_recovery_initiated', ip, {
          userAgent,
          email: parsed.data.email,
          method: parsed.data.method,
        });

        return NextResponse.json({
          message: result.message,
          requiresVerification: result.requiresVerification,
          verificationMethods: result.verificationMethods,
          // Don't return token in production
          ...(process.env.NODE_ENV === 'development' && result.recoveryToken && {
            recoveryToken: result.recoveryToken,
          }),
        });
      } else if (action === 'complete') {
        // Complete recovery
        const parsed = completeRecoverySchema.safeParse(body);

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

        const result = await AccountRecoveryService.completeRecovery(
          parsed.data.recoveryToken,
          parsed.data.newPassword,
          parsed.data.verifications
        );

        if (!result.success) {
          await authService.logSecurityEvent('unknown', 'account_recovery_complete_failed', ip, {
            userAgent,
          });

          return NextResponse.json(
            {
              error: result.message,
              code: 'RECOVERY_COMPLETE_FAILED',
            },
            { status: 400 }
          );
        }

        await authService.logSecurityEvent('unknown', 'account_recovery_completed', ip, {
          userAgent,
        });

        return NextResponse.json({
          message: result.message,
        });
      } else {
        return NextResponse.json(
          {
            error: 'إجراء غير صالح. يجب أن يكون "initiate" أو "complete"',
            code: 'INVALID_ACTION',
          },
          { status: 400 }
        );
      }

    } catch (error) {
      logger.error('Error in account recovery:', error);

      await authService.logSecurityEvent('unknown', 'account_recovery_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch(() => { });

      return NextResponse.json(
        {
          error: 'حدث خطأ أثناء عملية الاسترداد',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  });
}

