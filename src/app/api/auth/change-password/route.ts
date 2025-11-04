import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { securityLogger } from '@/lib/security-logger';
import { securityNotificationService } from '@/lib/security/security-notifications';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/change-password
 * تغيير كلمة المرور للمستخدم
 */
export async function POST(request: NextRequest) {
  try {
    // التحقق من التوكن
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = await authService.verifyToken(token);

    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'رمز غير صالح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'كلمة المرور الحالية والجديدة مطلوبة' },
        { status: 400 }
      );
    }

    // التحقق من قوة كلمة المرور الجديدة
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون على الأقل 8 أحرف' },
        { status: 400 }
      );
    }

    // الحصول على المستخدم من قاعدة البيانات
    const user = await prisma.user.findUnique({
      where: { id: verification.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordValid = await authService.comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      // تسجيل محاولة فاشلة
      const ip = authService.getClientIP(request);
      const userAgent = authService.getUserAgent(request);
      await securityLogger.logEvent({
        userId: verification.user.id,
        eventType: 'LOGIN_FAILED',
        ip,
        userAgent,
        metadata: { reason: 'Invalid current password for password change' },
      });

      return NextResponse.json(
        { error: 'كلمة المرور الحالية غير صحيحة' },
        { status: 401 }
      );
    }

    // التحقق من أن كلمة المرور الجديدة مختلفة
    const isSamePassword = await authService.comparePasswords(
      newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      return NextResponse.json(
        { error: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية' },
        { status: 400 }
      );
    }

    // تشفير كلمة المرور الجديدة
    const newPasswordHash = await authService.hashPassword(newPassword);

    // تحديث كلمة المرور
    await prisma.user.update({
      where: { id: verification.user.id },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    // تسجيل الحدث وإرسال إشعار
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);
    await securityLogger.logPasswordChanged(
      verification.user.id,
      ip,
      userAgent
    );

    // إرسال إشعار أمني
    await securityNotificationService.notifyPasswordChanged(
      verification.user.id,
      ip
    );

    return NextResponse.json({
      message: 'تم تغيير كلمة المرور بنجاح',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تغيير كلمة المرور' },
      { status: 500 }
    );
  }
}

