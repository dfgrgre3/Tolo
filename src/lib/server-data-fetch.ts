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
      // Parallelize requests for better performance using aggregation
      const [stats, sessionDates, tasksCompleted] = await Promise.all([
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
      const totalMinutes = stats._sum.durationMin || 0;

      // Calculate average focus
      const averageFocus = stats._avg.focusScore || 0;

      // Calculate streak (optimized O(N) single pass)
      let streakDays = 0;
      if (sessionDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Check if the most recent session is today or yesterday
        const lastDate = new Date(sessionDates[0].createdAt);
        lastDate.setHours(0, 0, 0, 0);

        // If the user hasn't studied today or yesterday, streak is 0
        if (lastDate.getTime() >= yesterday.getTime()) {
           streakDays = 1;
           let checkDate = new Date(lastDate);
           // The next date we are looking for is the day before the current streak day
           checkDate.setDate(checkDate.getDate() - 1);

           // Iterate backwards from the second most recent session
           for (let i = 1; i < sessionDates.length; i++) {
             const currentDate = new Date(sessionDates[i].createdAt);
             currentDate.setHours(0, 0, 0, 0);

             if (currentDate.getTime() === checkDate.getTime()) {
               // Found a session on the consecutive previous day
               streakDays++;
               checkDate.setDate(checkDate.getDate() - 1);
             } else if (currentDate.getTime() < checkDate.getTime()) {
               // Gap found (current session is older than the expected checkDate)
               break;
             }
             // If currentDate > checkDate, it means we have multiple sessions on the same day
             // (or more recent days if sorting failed, but we ordered by desc).
             // Since we already counted this day (implied by checkDate moving back only when we find a match),
             // we just continue to the next session.
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
