import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { successResponse, handleApiError, withAuth } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        // Get all exams that the user hasn't taken yet
        // Note: Exam model doesn't have a date field, so we return all untaken exams
        const tests = await prisma.exam.findMany({
          include: {
            results: {
              where: {
                userId: authUser.userId,
              },
            },
          },
        });

        // Filter tests that the user hasn't taken yet
        const upcomingTests = tests.filter((test) =>
          test.results.length === 0
        );

        return successResponse({ tests: upcomingTests });
      } catch (error) {
        logger.error('Error fetching upcoming tests:', error);
        return handleApiError(error);
      }
    });
  });
}
