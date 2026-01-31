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
      // Optimize: Fetch aggregates and dates in parallel
      const [aggregates, sessionDates, tasksCompleted] = await Promise.all([
        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMin: true },
          _avg: { focusScore: true },
        }),
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.task.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        }),
      ]);

      // Calculate total minutes
      const totalMinutes = aggregates._sum.durationMin || 0;

      // Calculate average focus
      const averageFocus = aggregates._avg.focusScore || 0;

      // Calculate current streak
      // Note: This calculates the streak ending at the most recent session
      let streakDays = 0;
      if (sessionDates.length > 0) {
        streakDays = 1;
        const lastSessionDate = new Date(sessionDates[0].createdAt);
        lastSessionDate.setHours(0, 0, 0, 0);

        let checkDate = new Date(lastSessionDate);

        // Optimized linear scan for streak calculation
        for (const session of sessionDates) {
          const sessionDate = new Date(session.createdAt);
          sessionDate.setHours(0, 0, 0, 0);

          if (sessionDate.getTime() === checkDate.getTime()) {
            continue;
          }

          const expectedPrev = new Date(checkDate);
          expectedPrev.setDate(expectedPrev.getDate() - 1);

          if (sessionDate.getTime() === expectedPrev.getTime()) {
            streakDays++;
            checkDate = expectedPrev;
          } else {
            break;
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

