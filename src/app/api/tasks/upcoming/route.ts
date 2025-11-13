
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-unified';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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

    // Get current date and tomorrow's date
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get upcoming tasks (due within 24 hours or overdue)
    const tasks = await prisma.task.findMany({
      where: {
        userId: decodedToken.userId,
        OR: [
          {
            dueAt: {
              lte: tomorrow,
              gte: now,
            },
          },
          {
            dueAt: {
              lt: now,
            },
            status: {
              not: 'COMPLETED',
            },
          },
        ],
      },
      orderBy: {
        dueAt: 'asc',
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    logger.error('Error fetching upcoming tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming tasks' },
      { status: 500 }
    );
    }
  });
}
