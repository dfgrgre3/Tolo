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
      // Execute queries in parallel for better performance
      const [aggregations, tasksCompleted, sessionDates] = await Promise.all([
        // Calculate totals directly in DB (much faster than fetching all records)
        prisma.studySession.aggregate({
          where: { userId },
          _sum: {
            durationMin: true,
          },
          _avg: {
            focusScore: true,
          },
        }),

        // Count completed tasks
        prisma.task.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        }),

        // Fetch only dates for streak calculation (optimized payload)
        // Ordered by descending to get latest first
        prisma.studySession.findMany({
          where: { userId },
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      // Calculate total minutes
      const totalMinutes = aggregations._sum.durationMin || 0;

      // Calculate average focus
      const averageFocus = aggregations._avg.focusScore || 0;

      // Calculate current streak
      // Optimized: Use Set for O(1) lookup and iterate linearly
      let streakDays = 0;
      if (sessionDates.length > 0) {
        // Based on original logic: streak ends at the last session date
        // (even if that was days ago)
        const lastSessionDate = new Date(sessionDates[0].createdAt);
        lastSessionDate.setHours(0, 0, 0, 0);

        // Build a Set of unique study days
        const studyDays = new Set<number>();
        for (const session of sessionDates) {
          const d = new Date(session.createdAt);
          d.setHours(0, 0, 0, 0);
          studyDays.add(d.getTime());
        }

        // Count consecutive days backwards from the last session
        let checkDate = new Date(lastSessionDate);
        while (studyDays.has(checkDate.getTime())) {
          streakDays++;
          checkDate.setDate(checkDate.getDate() - 1);
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
