import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication
      const verification = await authService.verifyTokenFromRequest(req);

      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { error: 'غير مصرح' },
          { status: 401 }
        );
      }

      const userId = verification.user.userId;

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
      logger.error('Failed to fetch security settings:', error);
      return NextResponse.json(
        { error: 'فشل جلب إعدادات الأمان' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication
      const verification = await authService.verifyTokenFromRequest(req);

      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { error: 'غير مصرح' },
          { status: 401 }
        );
      }

      const userId = verification.user.userId;
      const body = await req.json();

      // Validate allowed fields
      // Only include fields that actually exist in the User model
      const allowedFields = [
        'emailNotifications',
        'smsNotifications',
        // 'loginAlerts', // Not in User model
        // 'suspiciousActivityAlerts', // Not in User model
      ];

      const updateData: Record<string, boolean> = {};

      for (const field of allowedFields) {
        if (field in body && typeof body[field] === 'boolean') {
          updateData[field] = body[field];
        }
      }

      // Handle aliases - if loginAlerts or suspiciousActivityAlerts is passed, update emailNotifications
      if (('loginAlerts' in body && typeof body.loginAlerts === 'boolean') ||
        ('suspiciousActivityAlerts' in body && typeof body.suspiciousActivityAlerts === 'boolean')) {
        // Only update if emailNotifications wasn't explicitly set
        if (!('emailNotifications' in updateData)) {
          updateData['emailNotifications'] = body.loginAlerts ?? body.suspiciousActivityAlerts ?? body.emailNotifications;
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
      const ip = authService.getClientIP(req);
      const userAgent = authService.getUserAgent(req);
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
      logger.error('Failed to update security settings:', error);
      return NextResponse.json(
        { error: 'فشل تحديث إعدادات الأمان' },
        { status: 500 }
      );
    }
  });
}
