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
      // Run queries in parallel for better performance
      const [aggregates, sessionDates, tasksCompleted] = await Promise.all([
        // Calculate totals and averages in the database
        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMin: true },
          _avg: { focusScore: true },
        }),
        // Fetch only dates for streak calculation
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

      const totalMinutes = aggregates._sum.durationMin || 0;
      // Filter out null focus scores equivalent to existing logic (aggregate _avg handles nulls)
      const averageFocus = Math.round((aggregates._avg.focusScore || 0) * 100) / 100;

      // Calculate current streak with O(N) complexity
      let streakDays = 0;
      if (sessionDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const latestSessionDate = new Date(sessionDates[0].createdAt);
        latestSessionDate.setHours(0, 0, 0, 0);

        // Calculate difference in days between today and latest session
        const diffTime = today.getTime() - latestSessionDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // If the latest session was today (0) or yesterday (1), the streak is active
        if (diffDays <= 1) {
          streakDays = 1;

          // The date we are looking for next (one day before the latest session)
          const expectedDate = new Date(latestSessionDate);
          expectedDate.setDate(expectedDate.getDate() - 1);

          let lastProcessedDate = latestSessionDate.getTime();

          for (let i = 1; i < sessionDates.length; i++) {
            const currentSessionDate = new Date(sessionDates[i].createdAt);
            currentSessionDate.setHours(0, 0, 0, 0);
            const currentTime = currentSessionDate.getTime();

            if (currentTime === lastProcessedDate) {
              continue; // Skip multiple sessions on same day
            }

            if (currentTime === expectedDate.getTime()) {
              streakDays++;
              lastProcessedDate = currentTime;
              expectedDate.setDate(expectedDate.getDate() - 1);
            } else {
              // Gap found
              break;
            }
          }
        }
      }

      return {
        totalMinutes,
        averageFocus,
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

