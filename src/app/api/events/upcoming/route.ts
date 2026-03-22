
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        // Get current date and tomorrow's date
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get upcoming events (within 24 hours)
        const events = await prisma.event.findMany({
          where: {
            startDate: {
              lte: tomorrow,
              gte: now,
            },
            OR: [
              {
                isPublic: true,
              },
              {
                attendees: {
                  some: { userId },
                },
              },
            ],
          },
          include: {
            attendees: {
              where: { userId },
            },
          },
        });

        return successResponse({ events });
      } catch (error) {
        logger.error('Error fetching upcoming events:', error);
        return handleApiError(error);
      }
    });
  });
}
