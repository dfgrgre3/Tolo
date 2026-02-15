import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth-service';
import { securityLogger } from '@/lib/security-logger';
import { securityNotificationService } from '@/lib/security/security-notifications';
import { passwordHistoryService } from '@/lib/services/password-history-service';
import { prisma } from '@/lib/db';
import { createStandardErrorResponse, isConnectionError, parseRequestBody } from '@/lib/auth-utils';
import { passwordSchema } from '@/lib/validations/auth';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/change-password
 * تغيير كلمة المرور للمستخدم
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: passwordSchema,
});

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const ip = authService.getClientIP(req);
    const userAgent = authService.getUserAgent(req);

    try {
      // التحقق من التوكن
      const authHeader = req.headers.get('Authorization');
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
      const payload = await authService.verifyToken(token);

      if (!payload || !payload.userId) {
        return NextResponse.json(
          {
            error: 'رمز غير صالح أو منتهي الصلاحية.',
            code: 'INVALID_TOKEN',
          },
          { status: 401 }
        );
      }

      const userId = payload.userId as string;

      // التحقق من صحة البيانات المدخلة
      const bodyResult = await parseRequestBody(req, { maxSize: 1024, required: true });
      if (!bodyResult.success) return bodyResult.error;

      const parsed = changePasswordSchema.safeParse(bodyResult.data);

      if (!parsed.success) {
        return createStandardErrorResponse(
          {
            error: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors,
          },
          'بيانات غير صحيحة',
          400
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
        logger.error('Database error while finding user:', dbError);

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
      const isCurrentPasswordValid = await authService.verifyPassword(
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
      const isSamePassword = await authService.verifyPassword(
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

      // التحقق من أن كلمة المرور الجديدة ليست في السجل
      const historyCheck = await passwordHistoryService.checkPasswordInHistory(userId, newPassword);
      if (historyCheck.exists) {
        return NextResponse.json(
          {
            error: historyCheck.message || 'لا يمكن إعادة استخدام كلمة المرور هذه. يرجى اختيار كلمة مرور جديدة.',
            code: 'PASSWORD_IN_HISTORY',
          },
          { status: 400 }
        );
      }

      // تشفير كلمة المرور الجديدة
      let newPasswordHash: string;
      try {
        newPasswordHash = await authService.hashPassword(newPassword);
      } catch (hashError) {
        logger.error('Password hashing error:', hashError);
        return NextResponse.json(
          {
            error: 'حدث خطأ أثناء معالجة كلمة المرور. حاول مرة أخرى.',
            code: 'HASH_ERROR',
          },
          { status: 500 }
        );
      }

      // تحديث كلمة المرور وحفظ القديمة في السجل
      try {
        // حفظ كلمة المرور القديمة في السجل قبل تحديثها
        await passwordHistoryService.savePasswordHistory(userId, user.passwordHash);

        const now = new Date();
        await prisma.user.update({
          where: { id: userId },
          data: {
            passwordHash: newPasswordHash,
            passwordChangedAt: now,
            updatedAt: now,
          },
        });
      } catch (dbError) {
        logger.error('Database error while updating password:', dbError);

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
        logger.error('Failed to send password change notification:', notificationError);
      }

      return NextResponse.json({
        message: 'تم تغيير كلمة المرور بنجاح.',
        success: true,
      });
    } catch (error) {
      logger.error('Change password error:', error);

      // Log security event safely
      try {
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const payload = await authService.verifyToken(token);
          if (payload?.userId) {
            await authService.logSecurityEvent(payload.userId as string, 'password_change_error', ip, {
              userAgent,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      } catch (logError) {
        logger.error('Failed to log security event:', logError);
      }

      return createStandardErrorResponse(
        error,
        'حدث خطأ غير متوقع أثناء تغيير كلمة المرور. حاول مرة أخرى لاحقاً.'
      );
    }
  });
}

