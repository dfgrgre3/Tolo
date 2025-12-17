
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// جلب إعدادات الإشعارات
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication
      const verification = await authService.verifyTokenFromRequest(req, { checkSession: true });
    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const authUser = verification.user;

    // Get user notification settings
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { 
        emailNotifications: true,
        smsNotifications: true,
        phone: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      emailNotifications: user.emailNotifications,
      smsNotifications: user.smsNotifications,
      phone: user.phone
    });
  } catch (error) {
    logger.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    );
    }
  });
}

// تحديث إعدادات الإشعارات
export async function PUT(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication
      const verification = await authService.verifyTokenFromRequest(req, { checkSession: true });
      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      const authUser = verification.user;

      const { emailNotifications, smsNotifications, phone } = await req.json();

    // Update user notification settings
    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        emailNotifications,
        smsNotifications,
        phone
      },
      select: {
        id: true,
        emailNotifications: true,
        smsNotifications: true,
        phone: true
      }
    });

    return NextResponse.json({
      success: true,
      emailNotifications: updatedUser.emailNotifications,
      smsNotifications: updatedUser.smsNotifications,
      phone: updatedUser.phone
    });
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
    }
  });
}
