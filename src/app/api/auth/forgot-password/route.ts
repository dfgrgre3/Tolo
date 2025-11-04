import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { authService } from '@/lib/auth-service';
import { createErrorResponse, emailSchema, RESET_TOKEN_EXPIRY_MS, isConnectionError } from '../_helpers';

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const buildClientId = (ip: string, userAgent: string) =>
  `${ip || 'unknown'}-${userAgent || 'unknown'}`;

export async function POST(request: NextRequest) {
  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);
  const clientId = buildClientId(ip, userAgent);

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
      console.warn('Redis unavailable for rate limiting:', redisError);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'البريد الإلكتروني غير صالح',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email as string;

    // Find user by email with error handling
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          resetToken: true,
          resetTokenExpires: true,
        },
      });
    } catch (dbError) {
      console.error('Database error while finding user:', dbError);
      
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
      
      throw dbError;
    }

    // Don't reveal if user exists or not for security (timing attack prevention)
    // Always return the same response regardless of user existence
    if (!user) {
      // Log security event for monitoring (without revealing user existence)
      await authService.logSecurityEvent(null, 'forgot_password_requested', ip, {
        userAgent,
        emailDomain: normalizedEmail.split('@')[1],
      });

      return NextResponse.json({
        message: 'إذا كان بريدك الإلكتروني مسجلاً لدينا، ستتلقى رابط إعادة تعيين كلمة المرور.',
      });
    }

    // Check if there's an existing valid reset token
    const hasValidToken = user.resetToken && 
      user.resetTokenExpires && 
      new Date(user.resetTokenExpires) > new Date();

    // Generate new reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    // Save token and expiration to user
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpires,
        },
      });
    } catch (dbError) {
      console.error('Database error while updating reset token:', dbError);
      
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
      
      throw dbError;
    }

    // Log security event
    await authService.logSecurityEvent(user.id, 'forgot_password_token_generated', ip, {
      userAgent,
      hasExistingToken: hasValidToken,
    });

    // In production, send email here
    // For now, we return a generic success message
    return NextResponse.json({
      message: 'إذا كان بريدك الإلكتروني مسجلاً لدينا، ستتلقى رابط إعادة تعيين كلمة المرور.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Log security event safely
    try {
      await authService.logSecurityEvent(null, 'forgot_password_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    return createErrorResponse(
      error,
      'حدث خطأ غير متوقع أثناء معالجة طلب إعادة تعيين كلمة المرور. حاول مرة أخرى لاحقاً.'
    );
  }
}