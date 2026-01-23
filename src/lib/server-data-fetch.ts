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
      // Optimization: Use database aggregations and fetch only necessary fields
      const [aggregations, tasksCompleted, sessionsForStreak] = await Promise.all([
        // 1. Aggregations for stats
        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMin: true },
          _avg: { focusScore: true },
        }),
        // 2. Task count
        prisma.task.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        }),
        // 3. Fetch only dates for streak calculation, ordered desc (newest first)
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Calculate total minutes
      const totalMinutes = aggregations._sum.durationMin || 0;

      // Calculate average focus
      const averageFocus = aggregations._avg.focusScore || 0;

      // Calculate current streak
      // Algorithm optimized for DESC order: checks consecutive days backwards from newest
      let streakDays = 0;
      if (sessionsForStreak.length > 0) {
        // Use the most recent session as the anchor
        const currentDate = new Date(sessionsForStreak[0].createdAt);
        currentDate.setHours(0, 0, 0, 0);

        streakDays = 1;

        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() - 1); // Start checking from yesterday

        // Iterate through sessions starting from the second one (index 1)
        for (let i = 1; i < sessionsForStreak.length; i++) {
          const sessionDate = new Date(sessionsForStreak[i].createdAt);
          sessionDate.setHours(0, 0, 0, 0);

          const diffTime = checkDate.getTime() - sessionDate.getTime();

          if (diffTime === 0) {
            // Found the consecutive day
            streakDays++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (sessionDate.getTime() > checkDate.getTime()) {
            // Same day as previous iteration (multiple sessions per day), skip
            continue;
          } else {
            // Gap found, break streak
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

