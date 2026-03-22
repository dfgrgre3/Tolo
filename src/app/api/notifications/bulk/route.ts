
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { notifications } = await req.json();

        if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
          return badRequestResponse('Notifications array is required');
        }

        // Validate notifications
        for (const notification of notifications) {
          if (!notification.title || !notification.message) {
            return badRequestResponse('Title and message are required for each notification');
          }
        }

        // Create notifications
        const createdNotifications = await Promise.all(
          notifications.map(notification =>
            prisma.notification.create({
              data: {
                userId,
                title: notification.title,
                message: notification.message,
                type: (notification.type || 'info').toUpperCase(),
                actionUrl: notification.actionUrl,
                icon: notification.icon,
                isRead: false
              }
            })
          )
        );

        return successResponse({
          success: true,
          count: createdNotifications.length,
          notifications: createdNotifications
        }, undefined, 201);
      } catch (error) {
        logger.error('Error creating bulk notifications:', error);
        return handleApiError(error);
      }
    });
  });
}
