
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Verify authentication via middleware
      const userId = req.headers.get("x-user-id");
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      const authUser = { userId };

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

      return NextResponse.json({ tests: upcomingTests });
    } catch (error) {
      logger.error('Error fetching upcoming tests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch upcoming tests' },
        { status: 500 }
      );
    }
  });
}
