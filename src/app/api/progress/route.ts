import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { withAuthCache } from '@/lib/cache-middleware';
import { invalidateUserCache } from '@/lib/cache-invalidation-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import { 
  createStandardErrorResponse, 
  createSuccessResponse,
  addSecurityHeaders 
} from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuthCache(req, handleGetRequest, 'progress', 300); // Cache for 5 minutes
  });
}

async function handleGetRequest(request: NextRequest) {
  try {
    // Verify authentication with timeout protection
    const verifyPromise = Promise.resolve(verifyToken(request));
    const verifyTimeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 5000); // 5 second timeout
    });

    const decodedToken = await Promise.race([verifyPromise, verifyTimeoutPromise]);
    if (!decodedToken) {
      const response = NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Get user's study streak with timeout protection
    // Optimization: Select only startTime to reduce data transfer
    const studySessionsPromise = prisma.studySession.findMany({
      where: {
        userId: decodedToken.userId,
      },
      orderBy: {
        startTime: 'desc',
      },
      select: {
        startTime: true,
      },
    });

    const studySessionsTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000);
    });

    // We cast the result because the select above returns a subset of fields
    const studySessions = (await Promise.race([
      studySessionsPromise,
      studySessionsTimeoutPromise,
    ])) as { startTime: Date }[];

    // Calculate streak days
    // Optimization: O(N) linear scan instead of O(N^2) nested loops
    let streakDays = 0;
    if (studySessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let lastCountedDate: Date | null = null;

      for (const session of studySessions) {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);

        // Skip future dates if any (shouldn't happen with desc sort and typical data, but safety check)
        if (sessionDate.getTime() > today.getTime()) {
          continue;
        }

        if (streakDays === 0) {
          // Check if streak starts today or yesterday
          if (
            sessionDate.getTime() === today.getTime() ||
            sessionDate.getTime() === yesterday.getTime()
          ) {
            streakDays = 1;
            lastCountedDate = sessionDate;
          } else {
            // Latest session is older than yesterday, so streak is 0.
            // Since sessions are ordered desc, we can stop.
            break;
          }
        } else {
          // Streak already started, check for continuity
          if (!lastCountedDate) break;

          if (sessionDate.getTime() === lastCountedDate.getTime()) {
            // Same day, ignore
            continue;
          }

          const expectedDate = new Date(lastCountedDate);
          expectedDate.setDate(expectedDate.getDate() - 1);

          if (sessionDate.getTime() === expectedDate.getTime()) {
            streakDays++;
            lastCountedDate = sessionDate;
          } else {
            // Gap found
            break;
          }
        }
      }
    }

    // Get recent goals (this is a placeholder, adjust based on your actual goals model) with timeout protection
    const recentGoalsPromise = prisma.customGoal.findMany({
      where: {
        userId: decodedToken.userId,
        title: {
          contains: 'هدف',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    const recentGoalsTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });

    const recentGoals = await Promise.race([recentGoalsPromise, recentGoalsTimeoutPromise]);

    // Type for goal with status
    type GoalWithStatus = Prisma.CustomGoalGetPayload<{}> & {
      achieved: boolean;
      notified: boolean;
    };

    // Mark goals as achieved (this is a placeholder logic)
    const goalsWithStatus: GoalWithStatus[] = recentGoals.map((goal: Prisma.CustomGoalGetPayload<{}>) => ({
      ...goal,
      achieved: Math.random() > 0.7, // Random for demo
      notified: false, // This would be stored in the database in a real app
    }));

    const result = { 
      streakDays,
      recentGoals: goalsWithStatus 
    };

    return createSuccessResponse(result);
  } catch (error) {
    logger.error('Error fetching progress:', error);
    return createStandardErrorResponse(
      error,
      'Failed to fetch progress'
    );
  }
}