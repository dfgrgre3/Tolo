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
      // Parallelize fetching
      // 1. Stats using DB aggregation (efficient)
      // 2. Dates for streak calculation (optimized select)
      // 3. Task count
      const [stats, dates, tasksCompleted] = await Promise.all([
        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMin: true },
          _avg: { focusScore: true },
        }),
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' }, // Descending for linear streak check
        }),
        prisma.task.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        }),
      ]);

      const totalMinutes = stats._sum.durationMin || 0;
      const averageFocus = stats._avg.focusScore || 0;

      // Calculate current streak
      let streakDays = 0;
      if (dates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Check the most recent session
        const lastSessionDate = new Date(dates[0].createdAt);
        lastSessionDate.setHours(0, 0, 0, 0);

        // Check if the user studied today or yesterday
        if (lastSessionDate.getTime() === today.getTime() || lastSessionDate.getTime() === yesterday.getTime()) {
          streakDays = 1;
          let currentStreakDate = lastSessionDate;

          // Iterate through the rest of the dates (already sorted desc)
          for (let i = 1; i < dates.length; i++) {
            const sessionDate = new Date(dates[i].createdAt);
            sessionDate.setHours(0, 0, 0, 0);

            // Skip multiple sessions on the same day
            if (sessionDate.getTime() === currentStreakDate.getTime()) {
              continue;
            }

            // Check if this session is exactly one day before the current streak date
            const expectedDate = new Date(currentStreakDate);
            expectedDate.setDate(expectedDate.getDate() - 1);

            if (sessionDate.getTime() === expectedDate.getTime()) {
              streakDays++;
              currentStreakDate = sessionDate;
            } else {
              // Streak broken
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
