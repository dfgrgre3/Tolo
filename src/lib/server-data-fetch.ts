'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { CacheService } from '@/lib/redis';
import { logger } from '@/lib/logger';

export interface ProgressSummary {
  totalMinutes: number;
  averageFocus: number;
  tasksCompleted: number;
  streakDays: number;
}

import { TokenService, TokenPayload } from '@/lib/auth/token-service';

/**
 * Get user ID from server-side (cookies or session)
 */
async function getServerUserId(): Promise<string | null> {
  try {
    // Try to get authenticated user first
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value || cookieStore.get('token')?.value;

    if (token) {
      const payload = await TokenService.verifyToken<TokenPayload>(token);
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
      const [aggregations, streakSessions, tasksCompleted] = await Promise.all([
        // Aggregate duration and focus score
        prisma.studySession.aggregate({
          where: { userId },
          _sum: {
            durationMin: true,
          },
          _avg: {
            focusScore: true,
          },
        }),
        // Fetch only dates for streak calculation (descending for easier linear scan)
        prisma.studySession.findMany({
          where: { userId },
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
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
      if (streakSessions.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const latestSessionDate = new Date(streakSessions[0].createdAt);
        latestSessionDate.setHours(0, 0, 0, 0);

        // Check if the user studied today or yesterday
        const diffTime = Math.abs(today.getTime() - latestSessionDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
          streakDays = 1;
          let currentDate = latestSessionDate;

          // Iterate through sessions to find consecutive days
          for (let i = 1; i < streakSessions.length; i++) {
            const sessionDate = new Date(streakSessions[i].createdAt);
            sessionDate.setHours(0, 0, 0, 0);

            const dayDiff = (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);

            if (dayDiff === 1) {
              // Found previous day
              streakDays++;
              currentDate = sessionDate;
            } else if (dayDiff > 1) {
              // Break in streak
              break;
            }
            // If dayDiff === 0, it's the same day, so we continue without incrementing streak or changing currentDate
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

