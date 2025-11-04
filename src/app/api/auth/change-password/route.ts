import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { securityLogger } from '@/lib/security-logger';
import { securityNotificationService } from '@/lib/security/security-notifications';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, passwordSchema, isConnectionError } from '../_helpers';

/**
 * POST /api/auth/change-password
 * تغيير كلمة المرور للمستخدم
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: passwordSchema,
});

export async function POST(request: NextRequest) {
  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);

  try {
    // التحقق من التوكن
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'غير مصرح. يرجى تسجيل الدخول أولاً.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = await authService.verifyToken(token);

    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        {
          error: 'رمز غير صالح أو منتهي الصلاحية.',
          code: 'INVALID_TOKEN',
        },
        { status: 401 }
      );
    }

    const userId = verification.user.id;

    // التحقق من صحة البيانات المدخلة
    const body = await request.json().catch(() => ({}));
    const parsed = changePasswordSchema.safeParse(body);

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

    const { currentPassword, newPassword } = parsed.data;

    // الحصول على المستخدم من قاعدة البيانات
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true,
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

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        {
          error: 'المستخدم غير موجود.',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordValid = await AuthService.comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      // تسجيل محاولة فاشلة
      await securityLogger.logEvent({
        userId,
        eventType: 'LOGIN_FAILED',
        ip,
        userAgent,
        metadata: { reason: 'Invalid current password for password change' },
      });

      await authService.logSecurityEvent(userId, 'password_change_failed', ip, {
        userAgent,
        reason: 'invalid_current_password',
      });

      return NextResponse.json(
        {
          error: 'كلمة المرور الحالية غير صحيحة.',
          code: 'INVALID_CURRENT_PASSWORD',
        },
        { status: 401 }
      );
    }

    // التحقق من أن كلمة المرور الجديدة مختلفة
    const isSamePassword = await AuthService.comparePasswords(
      newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      return NextResponse.json(
        {
          error: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.',
          code: 'SAME_PASSWORD',
        },
        { status: 400 }
      );
    }

    // تشفير كلمة المرور الجديدة
    let newPasswordHash: string;
    try {
      newPasswordHash = await AuthService.hashPassword(newPassword);
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

    // تحديث كلمة المرور
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
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

    // تسجيل الحدث وإرسال إشعار
    try {
      await securityLogger.logPasswordChanged(userId, ip, userAgent);
      await authService.logSecurityEvent(userId, 'password_changed', ip, {
        userAgent,
      });
      await securityNotificationService.notifyPasswordChanged(userId, ip);
    } catch (notificationError) {
      // لا نفشل العملية إذا فشل الإشعار
      console.error('Failed to send password change notification:', notificationError);
    }

    return NextResponse.json({
      message: 'تم تغيير كلمة المرور بنجاح.',
      success: true,
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    // Log security event safely
    try {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const verification = await authService.verifyToken(token);
        if (verification.isValid && verification.user) {
          await authService.logSecurityEvent(verification.user.id, 'password_change_error', ip, {
            userAgent,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    return createErrorResponse(
      error,
      'حدث خطأ غير متوقع أثناء تغيير كلمة المرور. حاول مرة أخرى لاحقاً.'
    );
  }
}

