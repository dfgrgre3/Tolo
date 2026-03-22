
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { notificationIds, all } = await req.json();

        if (!notificationIds && !all) {
          return badRequestResponse('Notification IDs or all flag is required');
        }

        let updatedCount = 0;

        if (all) {
          // Mark all notifications as read
          const result = await prisma.notification.updateMany({
            where: {
              userId,
              isRead: false,
            },
            data: {
              isRead: true,
            },
          });
          updatedCount = result.count;
        } else {
          // Mark specific notifications as read
          const result = await prisma.notification.updateMany({
            where: {
              id: {
                in: notificationIds,
              },
              userId,
            },
            data: {
              isRead: true,
            },
          });
          updatedCount = result.count;
        }

        // Get remaining unread count
        const unreadCount = await prisma.notification.count({
          where: {
            userId,
            isRead: false,
          },
        });

        return successResponse({
          success: true,
          updatedCount,
          unreadCount
        });
      } catch (error) {
        logger.error('Error marking notifications as read:', error);
        return handleApiError(error);
      }
    });
  });
}
