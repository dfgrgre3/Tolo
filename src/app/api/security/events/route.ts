import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication
      const verification = await authService.verifyTokenFromRequest(req);
      
      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          { error: 'غير مصرح' },
          { status: 401 }
        );
      }

      const userId = verification.user.id;

      // Get query parameters
      const searchParams = req.nextUrl.searchParams;
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
    logger.error('Failed to fetch security events:', error);
    return NextResponse.json(
      { error: 'فشل جلب الأحداث الأمنية' },
      { status: 500 }
    );
    }
  });
}

