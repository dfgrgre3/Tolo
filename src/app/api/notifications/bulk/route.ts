
import { NextRequest } from 'next/server';

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

        // Use the unified notification service
        const { sendMultiChannelNotification } = await import('@/services/notification-sender');
        const createdNotifications = await Promise.all(
          notifications.map((notification) =>
          sendMultiChannelNotification({
            userId,
            title: notification.title,
            message: notification.message,
            type: (notification.type?.toLowerCase() || 'info') as 'info' | 'success' | 'warning' | 'error',
            actionUrl: notification.actionUrl,
            icon: notification.icon,
            channels: ['app']
          }).then((res) => res.app)
          )
        );

        return successResponse({
          success: true,
          count: createdNotifications.filter((n) => n !== null).length,
          notifications: createdNotifications.filter((n) => n !== null)
        }, undefined, 201);
      } catch (error) {
        logger.error('Error creating bulk notifications:', error);
        return handleApiError(error);
      }
    });
  });
}