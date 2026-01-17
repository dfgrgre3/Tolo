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
      // Performance Optimization: Use DB aggregation instead of fetching all sessions
      // This is much faster for users with many sessions
      const aggregationsPromise = prisma.studySession.aggregate({
        where: { userId },
        _sum: { durationMin: true },
        _avg: { focusScore: true },
      });

      const tasksCountPromise = prisma.task.count({
        where: {
          userId,
          status: 'COMPLETED',
        },
      });

      // For streak, we only need createdAt dates, ordered by latest first
      // This avoids transferring large objects
      const sessionDatesPromise = prisma.studySession.findMany({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      });

      // Run queries in parallel
      const [aggregations, tasksCompleted, sessionDates] = await Promise.all([
        aggregationsPromise,
        tasksCountPromise,
        sessionDatesPromise
      ]);

      const totalMinutes = aggregations._sum.durationMin || 0;
      // focusScore is non-nullable with default 0, but _avg handles nulls (if no records)
      const averageFocus = aggregations._avg.focusScore || 0;

      // Calculate current streak
      // Optimized: O(N) using Set instead of O(N^2) using nested loops
      let streakDays = 0;
      if (sessionDates.length > 0) {
        const uniqueDays = new Set<number>();

        // Normalize to midnight local time to match original logic
        sessionDates.forEach(s => {
          const d = new Date(s.createdAt);
          d.setHours(0, 0, 0, 0);
          uniqueDays.add(d.getTime());
        });

        const sortedDays = Array.from(uniqueDays).sort((a, b) => b - a);

        if (sortedDays.length > 0) {
          streakDays = 1;
          const latestDateVal = sortedDays[0];

          // Count consecutive days backwards
          const checkDate = new Date(latestDateVal);
          checkDate.setDate(checkDate.getDate() - 1);

          let checking = true;
          while (checking) {
            if (uniqueDays.has(checkDate.getTime())) {
              streakDays++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              checking = false;
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
