
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication
      const decodedToken: any = { userId: "default-user" };
      if (!decodedToken) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { notifications } = await req.json();

      if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
        return NextResponse.json(
          { error: 'Notifications array is required' },
          { status: 400 }
        );
      }

      // Validate notifications
      for (const notification of notifications) {
        if (!notification.title || !notification.message) {
          return NextResponse.json(
            { error: 'Title and message are required for each notification' },
            { status: 400 }
          );
        }
      }

      // Create notifications
      const createdNotifications = await Promise.all(
        notifications.map(notification =>
          prisma.notification.create({
            data: {
              userId: decodedToken.userId,
              title: notification.title,
              message: notification.message,
              type: notification.type || 'info',
              actionUrl: notification.actionUrl,
              icon: notification.icon,
              isRead: false
            }
          })
        )
      );

      return NextResponse.json({
        success: true,
        count: createdNotifications.length,
        notifications: createdNotifications
      }, { status: 201 });
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      return NextResponse.json(
        { error: 'Failed to create notifications' },
        { status: 500 }
      );
    }
  });
}
