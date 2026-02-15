import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { PhoneVerificationService } from '@/lib/services/phone-verification-service';
import { authService } from '@/lib/services/auth-service';
import { extractRequestMetadata } from '@/app/api/auth/_helpers';
import { z } from 'zod';

const sendOTPSchema = z.object({
  phone: z.string().min(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل'),
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
          `phone-otp-send:${clientId}`,
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

          await authService.logSecurityEvent('unknown', 'phone_otp_send_rate_limited', ip, {
            userAgent,
            attempts: rateLimitStatus.attempts,
            retryAfterSeconds,
          });

          return NextResponse.json(
            {
              error: 'تم تعليق محاولات إرسال رمز التحقق مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.',
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

      const userId = verification.user!.userId;

      // Parse and validate request body
      const body = await req.json();
      const parsed = sendOTPSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'رقم الهاتف غير صالح',
            code: 'INVALID_PHONE',
            details: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const { phone } = parsed.data;

      // Send OTP
      const result = await PhoneVerificationService.sendOTP(userId, phone);

      if (!result.success) {
        await authService.logSecurityEvent(userId, 'phone_otp_send_failed', ip, {
          userAgent,
          reason: result.message,
        });

        return NextResponse.json(
          {
            error: result.message,
            code: 'OTP_SEND_FAILED',
            ...(result.canResendAfter && { canResendAfter: result.canResendAfter }),
          },
          { status: 400 }
        );
      }

      // Log success
      await authService.logSecurityEvent(userId, 'phone_otp_sent', ip, {
        userAgent,
      });

      return NextResponse.json({
        message: result.message,
        expiresIn: result.expiresIn,
        canResendAfter: result.canResendAfter,
        // In development, return OTP for testing
        ...(process.env.NODE_ENV === 'development' && result.otp && { otp: result.otp }),
      });

    } catch (error) {
      logger.error('Error sending phone OTP:', error);

      await authService.logSecurityEvent('unknown', 'phone_otp_send_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch(() => { });

      return NextResponse.json(
        {
          error: 'حدث خطأ أثناء إرسال رمز التحقق',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  });
}

