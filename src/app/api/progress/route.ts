import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { withAuthCache } from '@/lib/cache-middleware';
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
    const studySessionsPromise = prisma.studySession.findMany({
      where: {
        userId: decodedToken.userId,
      },
      select: {
        startTime: true, // Optimization: Select only necessary field to reduce payload
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    const studySessionsTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000);
    });

    const studySessions = await Promise.race([studySessionsPromise, studySessionsTimeoutPromise]) as { startTime: Date }[];

    // Calculate streak days
    // Optimization: O(N) single pass calculation instead of O(N^2)
    let streakDays = 0;
    if (studySessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayTime = yesterday.getTime();

      const lastSessionDate = new Date(studySessions[0].startTime);
      lastSessionDate.setHours(0, 0, 0, 0);
      const lastSessionTime = lastSessionDate.getTime();

      // Streak is active if the last session was today or yesterday
      if (lastSessionTime === todayTime || lastSessionTime === yesterdayTime) {
        streakDays = 1;

        let expectedDate = new Date(lastSessionTime);
        expectedDate.setDate(expectedDate.getDate() - 1);
        let expectedTime = expectedDate.getTime();

        let lastProcessedTime = lastSessionTime;

        for (let i = 1; i < studySessions.length; i++) {
          const sessionDate = new Date(studySessions[i].startTime);
          sessionDate.setHours(0, 0, 0, 0);
          const sessionTime = sessionDate.getTime();

          if (sessionTime === lastProcessedTime) {
            continue; // Skip multiple sessions on the same day
          }
          lastProcessedTime = sessionTime;

          if (sessionTime === expectedTime) {
            streakDays++;
            expectedDate.setDate(expectedDate.getDate() - 1);
            expectedTime = expectedDate.getTime();
          } else {
            break; // Gap found, streak ends
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