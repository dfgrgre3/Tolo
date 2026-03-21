
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db-unified';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { successResponse, unauthorizedResponse, notFoundResponse, withAuth, handleApiError } from '@/lib/api-utils';

// جلب إعدادات الإشعارات
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(request, async (authUser) => {
      try {

        // Get user notification settings
        const user = await prisma.user.findUnique({
          where: { id: authUser.userId },
          select: {
            emailNotifications: true,
            smsNotifications: true,
            phone: true
          }
        });

        if (!user) {
          return notFoundResponse('User not found');
        }

        return successResponse({
          emailNotifications: user.emailNotifications,
          smsNotifications: user.smsNotifications,
          phone: user.phone
        });
      } catch (error) {
        logger.error('Error fetching notification settings:', error);
        return handleApiError(error);
      }
    });
  });
}

// تحديث إعدادات الإشعارات
export async function PUT(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(request, async (authUser) => {
      try {

        const { emailNotifications, smsNotifications, phone } = await req.json();

        // Update user notification settings
        const updatedUser = await prisma.user.update({
          where: { id: authUser.userId },
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

        return successResponse({
          success: true,
          emailNotifications: updatedUser.emailNotifications,
          smsNotifications: updatedUser.smsNotifications,
          phone: updatedUser.phone
        });
      } catch (error) {
        logger.error('Error updating notification settings:', error);
        return handleApiError(error);
      }
    });
  });
}
