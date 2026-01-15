'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { CacheService } from '@/lib/redis';
import { authService } from '@/lib/services/auth-service';
import { logger } from '@/lib/logger';

export interface ProgressSummary {
  totalMinutes: number;
  averageFocus: number;
  tasksCompleted: number;
  streakDays: number;
}

/**
 * Get user ID from server-side (cookies or session)
 */
async function getServerUserId(): Promise<string | null> {
  try {
    // Try to get authenticated user first
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || cookieStore.get('access_token')?.value;

    if (token) {
      const payload = await authService.verifyToken(token);
      if (payload && payload.userId) {
        return payload.userId;
      }
    }

    // Fallback: check for guest user ID in cookies
    const guestUserId = cookieStore.get('tw_user_id')?.value;

    if (guestUserId && guestUserId !== 'undefined') {
      return guestUserId;
    }

    return null;
  } catch (error) {
    logger.warn('Error getting server user ID:', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Fetch progress summary from server-side
 * This replaces client-side fetching with server-side data fetching
 */
export async function getProgressSummary(): Promise<ProgressSummary | null> {
  try {
    const userId = await getServerUserId();

    if (!userId || userId === 'undefined') {
      // Return default values for non-authenticated users
      return {
        totalMinutes: 0,
        averageFocus: 0,
        tasksCompleted: 0,
        streakDays: 0,
      };
    }

    // Use cached data fetching for better performance
    const cacheKey = `progress_summary_${userId}`;
    const summary = await CacheService.getOrSet(cacheKey, async () => {
      // Parallelize queries for better performance
      // Optimization: Fetch only necessary fields and use DB aggregation
      const [aggregations, sessionDates, tasksCompleted] = await Promise.all([
        // Aggregate stats directly in DB
        prisma.studySession.aggregate({
          where: { userId },
          _sum: {
            durationMin: true,
          },
          _avg: {
            focusScore: true,
          },
        }),
        // Fetch only dates for streak calculation, ordered by most recent first
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        // Count completed tasks
        prisma.task.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        }),
      ]);

      const totalMinutes = aggregations._sum.durationMin || 0;
      const averageFocus = aggregations._avg.focusScore || 0;

      // Calculate current streak
      let streakDays = 0;
      if (sessionDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastSessionDate = new Date(sessionDates[0].createdAt);
        lastSessionDate.setHours(0, 0, 0, 0);

        // Check if the user studied today or yesterday
        const timeDiff = today.getTime() - lastSessionDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        // If last session was today (0) or yesterday (1)
        if (daysDiff <= 1) {
          streakDays = 1;
          let currentStreakDate = lastSessionDate;

          // Iterate backwards through history (already sorted DESC)
          for (let i = 1; i < sessionDates.length; i++) {
            const sessionDate = new Date(sessionDates[i].createdAt);
            sessionDate.setHours(0, 0, 0, 0);

            if (sessionDate.getTime() === currentStreakDate.getTime()) {
              // Multiple sessions on same day, ignore
              continue;
            }

            // Check if this session is exactly 1 day before current streak date
            const expectedPrevDate = new Date(currentStreakDate);
            expectedPrevDate.setDate(expectedPrevDate.getDate() - 1);

            if (sessionDate.getTime() === expectedPrevDate.getTime()) {
              streakDays++;
              currentStreakDate = sessionDate;
            } else {
              // Gap found in streak
              break;
            }
          }
        }
      }

      return {
        totalMinutes,
        averageFocus: Math.round(averageFocus * 100) / 100,
        tasksCompleted,
        streakDays,
      };
    }, 600); // Cache for 10 minutes

    return summary;
  } catch (error) {
    logger.error('Error fetching progress summary on server:', error);
    // Return default values on error
    return {
      totalMinutes: 0,
      averageFocus: 0,
      tasksCompleted: 0,
      streakDays: 0,
    };
  }
}
