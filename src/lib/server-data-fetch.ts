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
      // Fetch data in parallel for better performance
      const [aggregations, recentSessions, tasksCompleted] = await Promise.all([
        // Use database aggregation for sum and average (much faster than fetching all records)
        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMin: true },
          _avg: { focusScore: true },
        }),
        // Fetch only recent sessions for streak calculation (optimization: limit to 100)
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
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

      // Calculate current streak from recent sessions
      let streakDays = 0;
      if (recentSessions.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastSessionDate = new Date(recentSessions[0].createdAt);
        lastSessionDate.setHours(0, 0, 0, 0);

        // Check if the user studied today (matches original behavior)
        if (lastSessionDate.getTime() === today.getTime()) {
          streakDays = 1;

          // Create a Set of unique session dates for O(1) lookup
          const sessionDates = new Set(
            recentSessions.map((s) => {
              const d = new Date(s.createdAt);
              d.setHours(0, 0, 0, 0);
              return d.getTime();
            })
          );

          // Check consecutive previous days
          const checkDate = new Date(today);
          while (true) {
            checkDate.setDate(checkDate.getDate() - 1);
            if (sessionDates.has(checkDate.getTime())) {
              streakDays++;
            } else {
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

