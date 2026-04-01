import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import redisService from '@/lib/redis';

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
              isDeleted: false,
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
              isDeleted: false,
            },
            data: {
              isRead: true,
            },
          });
          updatedCount = result.count;
        }

        // Invalidate unread count cache
        await redisService.del(`user:${userId}:notifications:unread_count`).catch((err: any) => 
            logger.error('Failed to invalidate notification count cache after mark-read:', err)
        );

        // Optional: Return new count (will be fetched from DB on cache miss)
        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false, isDeleted: false }
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
