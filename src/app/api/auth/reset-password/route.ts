import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authService, AuthService } from '@/lib/auth-service';
import { securityNotificationService } from '@/lib/security/security-notifications';
import { createErrorResponse, passwordSchema, resetTokenSchema, isConnectionError } from '../_helpers';

const resetPasswordSchema = z.object({
  token: resetTokenSchema,
  password: passwordSchema,
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

        await authService.logSecurityEvent(null, 'reset_password_rate_limited', ip, {
          userAgent,
          attempts: rateLimitStatus.attempts,
          retryAfterSeconds,
        });

        return NextResponse.json(
          {
            error: 'تم تعليق محاولات إعادة تعيين كلمة المرور مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.',
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
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'بيانات غير صحيحة',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // Find user with valid reset token
    let user;
    try {
      user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpires: {
            gte: new Date(),
          },
        },
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

    if (!user) {
      // Log failed attempt for security monitoring
      await authService.logSecurityEvent(null, 'reset_password_invalid_token', ip, {
        userAgent,
        tokenLength: token.length,
      });

      return NextResponse.json(
        {
          error: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.',
          code: 'INVALID_OR_EXPIRED_TOKEN',
        },
        { status: 400 }
      );
    }

    // Hash new password
    let passwordHash: string;
    try {
      passwordHash = await AuthService.hashPassword(password);
    } catch (hashError) {
      console.error('Password hashing error:', hashError);
      return NextResponse.json(
        {
          error: 'حدث خطأ أثناء معالجة كلمة المرور. حاول مرة أخرى.',
          code: 'HASH_ERROR',
        },
        { status: 500 }
      );
    }

    // Update user password and clear reset token
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpires: null,
          updatedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Database error while updating password:', dbError);
      
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

    // Log security event and send notification
    try {
      await authService.logSecurityEvent(user.id, 'password_reset_success', ip, {
        userAgent,
      });
      await securityNotificationService.notifyPasswordChanged(user.id, ip);
    } catch (notificationError) {
      // لا نفشل العملية إذا فشل الإشعار
      console.error('Failed to send password reset notification:', notificationError);
    }

    return NextResponse.json({
      message: 'تم إعادة تعيين كلمة المرور بنجاح.',
      success: true,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    
    // Log security event safely
    try {
      await authService.logSecurityEvent(null, 'reset_password_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    return createErrorResponse(
      error,
      'حدث خطأ غير متوقع أثناء إعادة تعيين كلمة المرور. حاول مرة أخرى لاحقاً.'
    );
  }
}