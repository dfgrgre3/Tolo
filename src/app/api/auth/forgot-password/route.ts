import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { authService } from '@/lib/auth-service';
import { 
  createStandardErrorResponse,
  createSuccessResponse,
  emailSchema, 
  RESET_TOKEN_EXPIRY_MS, 
  isConnectionError,
  parseRequestBody,
  extractRequestMetadata,
  logSecurityEventSafely,
  withDatabaseQuery
} from '../_helpers';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

const forgotPasswordSchema = z.object({
  email: emailSchema,
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
      const rateLimitStatus = await rateLimitService.checkRateLimit(clientId, {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxAttempts: 5, // 5 attempts per 15 minutes
        lockoutMs: 30 * 60 * 1000, // 30 minutes lockout
      });

      if (!rateLimitStatus.allowed) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((rateLimitStatus.remainingTime || 900) / 60)
        );

        await authService.logSecurityEvent(null, 'forgot_password_rate_limited', ip, {
          userAgent,
          attempts: rateLimitStatus.attempts,
          retryAfterSeconds,
        });

        return NextResponse.json(
          {
            error: 'تم تعليق محاولات طلب إعادة تعيين كلمة المرور مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'RATE_LIMITED',
            retryAfterSeconds,
          },
          { status: 429 }
        );
      }
    } catch (redisError) {
      // If Redis is unavailable, log but continue
      logger.warn('Redis unavailable for rate limiting:', redisError);
    }

      // Parse and validate request body using standardized helper
      const bodyResult = await parseRequestBody<{
        email?: string;
      }>(req, {
        maxSize: 512,
        required: true,
      });

      if (!bodyResult.success) {
        return bodyResult.error;
      }

      const parsed = forgotPasswordSchema.safeParse(bodyResult.data);

      if (!parsed.success) {
        return createStandardErrorResponse(
          {
            error: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors,
          },
          'البريد الإلكتروني غير صالح',
          400
        );
      }

    const { email } = parsed.data;
    const normalizedEmail = email as string;

    // Find user by email with standardized error handling
    const userResult = await withDatabaseQuery(
      () => prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          resetToken: true,
          resetTokenExpires: true,
        },
      })
    );

    if (!userResult.success) {
      return userResult.response;
    }

    const user = userResult.data;

    // Don't reveal if user exists or not for security (timing attack prevention)
    // Always return the same response regardless of user existence
    if (!user) {
      // Log security event for monitoring (without revealing user existence)
      await logSecurityEventSafely(null, 'forgot_password_requested', {
        ip,
        userAgent,
        emailDomain: normalizedEmail.split('@')[1],
      });

      return createSuccessResponse({
        message: 'إذا كان بريدك الإلكتروني مسجلاً لدينا، ستتلقى رابط إعادة تعيين كلمة المرور.',
      });
    }

    // Check if there's an existing valid reset token
    const hasValidToken = (user as any).resetToken && 
      (user as any).resetTokenExpires && 
      new Date((user as any).resetTokenExpires) > new Date();

    // Generate new reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    // Save token and expiration to user with standardized error handling
    const updateResult = await withDatabaseQuery(
      () => prisma.user.update({
        where: { id: (user as any).id },
        data: {
          resetToken,
          resetTokenExpires,
        },
      })
    );

    if (!updateResult.success) {
      return updateResult.response;
    }

    // Log security event
    await logSecurityEventSafely((user as any).id, 'forgot_password_token_generated', {
      ip,
      userAgent,
      hasExistingToken: hasValidToken,
    });

    // In production, send email here
    // For now, we return a generic success message
    return createSuccessResponse({
      message: 'إذا كان بريدك الإلكتروني مسجلاً لدينا، ستتلقى رابط إعادة تعيين كلمة المرور.',
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    
    // Log security event safely
    await logSecurityEventSafely(null, 'forgot_password_error', {
      ip,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return createStandardErrorResponse(
      error,
      'حدث خطأ غير متوقع أثناء معالجة طلب إعادة تعيين كلمة المرور. حاول مرة أخرى لاحقاً.'
    );
    }
  });
}