import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { PhoneVerificationService } from '@/lib/services/phone-verification-service';
import { authService } from '@/lib/auth-service';
import { extractRequestMetadata } from '@/app/api/auth/_helpers';
import { z } from 'zod';

const verifyOTPSchema = z.object({
  otp: z.string().length(6, 'رمز التحقق يجب أن يكون 6 أرقام').regex(/^\d+$/, 'رمز التحقق يجب أن يحتوي على أرقام فقط'),
});

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent, clientId } = extractRequestMetadata(req);

    try {
      // Rate limiting check
      try {
        const { RateLimitingService } = await import('@/lib/rate-limiting-service');
        const { getRedisClient } = await import('@/lib/redis');
        
        const redis = await getRedisClient();
        const rateLimitService = new RateLimitingService(redis);
        const rateLimitStatus = await rateLimitService.checkRateLimit(
          `phone-otp-verify:${clientId}`,
          {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxAttempts: 10, // 10 attempts per 15 minutes
            lockoutMs: 30 * 60 * 1000, // 30 minutes lockout
          }
        );

        if (!rateLimitStatus.allowed) {
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil((rateLimitStatus.remainingTime || 900) / 60)
          );

          await authService.logSecurityEvent(null, 'phone_otp_verify_rate_limited', ip, {
            userAgent,
            attempts: rateLimitStatus.attempts,
            retryAfterSeconds,
          });

          return NextResponse.json(
            {
              error: 'تم تعليق محاولات التحقق مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.',
              code: 'RATE_LIMITED',
              retryAfterSeconds,
            },
            { status: 429 }
          );
        }
      } catch (redisError) {
        logger.warn('Redis unavailable for rate limiting:', redisError);
      }

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

      const userId = verification.user.id;

      // Parse and validate request body
      const body = await req.json();
      const parsed = verifyOTPSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'رمز التحقق غير صالح',
            code: 'INVALID_OTP',
            details: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const { otp } = parsed.data;

      // Verify OTP
      const result = await PhoneVerificationService.verifyOTPCode(userId, otp);

      if (!result.success) {
        await authService.logSecurityEvent(userId, 'phone_otp_verify_failed', ip, {
          userAgent,
          reason: result.message,
        });

        return NextResponse.json(
          {
            error: result.message,
            code: 'OTP_VERIFY_FAILED',
          },
          { status: 400 }
        );
      }

      // Log success
      await authService.logSecurityEvent(userId, 'phone_verified', ip, {
        userAgent,
      });

      return NextResponse.json({
        message: result.message,
        verified: result.verified,
      });

    } catch (error) {
      logger.error('Error verifying phone OTP:', error);
      
      await authService.logSecurityEvent(null, 'phone_otp_verify_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch(() => {});

      return NextResponse.json(
        {
          error: 'حدث خطأ أثناء التحقق من الرمز',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  });
}

