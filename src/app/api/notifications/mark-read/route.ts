
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication
      const decodedToken = verifyToken(req);
      if (!decodedToken) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { notificationIds, all } = await req.json();

    if (!notificationIds && !all) {
      return NextResponse.json(
        { error: 'Notification IDs or all flag is required' },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    if (all) {
      // Mark all notifications as read
      const result = await prisma.notification.updateMany({
        where: {
          userId: decodedToken.userId,
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
          userId: decodedToken.userId,
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
        userId: decodedToken.userId,
        isRead: false,
      },
    });

    return NextResponse.json({ 
      success: true, 
      updatedCount,
      unreadCount 
    });
  } catch (error) {
    logger.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
    }
  });
}
