
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { TaskStatus } from '@/lib/constants';
import { successResponse, withAuth, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        // Get current date and tomorrow's date
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get upcoming tasks (due within 24 hours or overdue)
        const tasks = await prisma.task.findMany({
          where: {
            userId: authUser.userId,
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
                  not: TaskStatus.COMPLETED,
                },
              },
            ],
          },
          orderBy: {
            dueAt: 'asc',
          },
        });

        return successResponse({ tasks });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
