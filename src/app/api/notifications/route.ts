
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Build where clause
    const where: any = { userId: decodedToken.userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    // Get user notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get count of unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        userId: decodedToken.userId,
        isRead: false,
      },
    });

    return NextResponse.json({ 
      notifications, 
      unreadCount,
      hasMore: notifications.length === limit 
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { title, message, type, actionUrl, icon } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: decodedToken.userId,
        title,
        message,
        type: type || 'info',
        actionUrl,
        icon,
        isRead: false
      }
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
