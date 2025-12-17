
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { TASK_STATUS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication
      const verification = await authService.verifyTokenFromRequest(req, { checkSession: true });
    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const authUser = verification.user;

    // Get current date and tomorrow's date
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get upcoming tasks (due within 24 hours or overdue)
    const tasks = await prisma.task.findMany({
      where: {
        userId: authUser.id,
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
              not: TASK_STATUS.COMPLETED,
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
