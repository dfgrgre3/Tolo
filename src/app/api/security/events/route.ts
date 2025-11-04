import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const verification = await authService.verifyTokenFromRequest(request);
    
    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const userId = verification.user.id;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const days = parseInt(searchParams.get('days') || '30');

    // Build query
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      userId,
      createdAt: {
        gte: startDate,
      },
    };

    if (type) {
      where.eventType = type;
    }

    // Fetch security events
    const events = await prisma.securityLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Group events by type for statistics
    const eventsByType = events.reduce((acc: any, event: any) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      events: events.map((event: any) => ({
        id: event.id,
        type: event.eventType.split('_')[0],
        eventType: event.eventType,
        ip: event.ip,
        userAgent: event.userAgent,
        location: event.location,
        metadata: event.metadata ? JSON.parse(event.metadata) : null,
        createdAt: event.createdAt,
      })),
      statistics: {
        total: events.length,
        byType: eventsByType,
      },
    });

  } catch (error) {
    console.error('Failed to fetch security events:', error);
    return NextResponse.json(
      { error: 'فشل جلب الأحداث الأمنية' },
      { status: 500 }
    );
  }
}

