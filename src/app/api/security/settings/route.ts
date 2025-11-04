import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const verification = await authService.verifyTokenFromRequest(request);
    
    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const userId = verification.user.id;

    // Get user settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        biometricEnabled: true,
        emailNotifications: true,
        smsNotifications: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: {
        twoFactorEnabled: user.twoFactorEnabled,
        biometricEnabled: user.biometricEnabled,
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications,
        loginAlerts: user.emailNotifications, // Can be a separate field
        suspiciousActivityAlerts: user.emailNotifications, // Can be a separate field
      },
    });

  } catch (error) {
    console.error('Failed to fetch security settings:', error);
    return NextResponse.json(
      { error: 'فشل جلب إعدادات الأمان' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const verification = await authService.verifyTokenFromRequest(request);
    
    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const userId = verification.user.id;
    const body = await request.json();

    // Validate allowed fields
    const allowedFields = [
      'emailNotifications',
      'smsNotifications',
      'loginAlerts',
      'suspiciousActivityAlerts',
    ];

    const updateData: any = {};

    for (const field of allowedFields) {
      if (field in body && typeof body[field] === 'boolean') {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'لا توجد حقول صالحة للتحديث' },
        { status: 400 }
      );
    }

    // Update user settings
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Log security event
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);
    await authService.logSecurityEvent(
      userId,
      'security_settings_updated',
      ip,
      { userAgent, changes: updateData }
    );

    return NextResponse.json({
      message: 'تم تحديث الإعدادات بنجاح',
      settings: updateData,
    });

  } catch (error) {
    console.error('Failed to update security settings:', error);
    return NextResponse.json(
      { error: 'فشل تحديث إعدادات الأمان' },
      { status: 500 }
    );
  }
}

