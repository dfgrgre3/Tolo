import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db-unified';
import { withAuthCache } from '@/lib/cache-middleware';
import { invalidateUserCache } from '@/lib/cache-invalidation-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import {
  createStandardErrorResponse,
  createSuccessResponse,
  addSecurityHeaders
} from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuthCache(req, handleGetRequest, 'progress', 300); // Cache for 5 minutes
  });
}

async function handleGetRequest(request: NextRequest) {
  try {
    // Verify authentication via headers
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      const response = NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }
    const decodedToken = { userId };

    // Get user's study streak with timeout protection
    const studySessionsPromise = prisma.studySession.findMany({
      where: {
        userId: decodedToken.userId,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    const studySessionsTimeoutPromise = new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000);
    });

    const studySessions = await Promise.race([studySessionsPromise, studySessionsTimeoutPromise]);

    // Calculate streak days
    let streakDays = 0;
    if (studySessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Type for study session with startTime
      type StudySessionWithStartTime = Pick<Prisma.StudySessionGetPayload<{}>, 'startTime'>;

      // Check if user studied today or yesterday
      const studiedToday = studySessions.some((session: StudySessionWithStartTime) => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });

      const studiedYesterday = studySessions.some((session: StudySessionWithStartTime) => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === yesterday.getTime();
      });

      if (studiedToday || studiedYesterday) {
        streakDays = 1;

        // Calculate consecutive days
        let checkDate = studiedToday ? yesterday : new Date(yesterday);
        checkDate.setDate(checkDate.getDate() - 1);

        while (true) {
          const studiedOnDate = studySessions.some((session: StudySessionWithStartTime) => {
            const sessionDate = new Date(session.startTime);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === checkDate.getTime();
          });

          if (studiedOnDate) {
            streakDays++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
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