'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/lib/cache';
import { logger } from '@/lib/logger';

export interface ProgressSummary {
  totalMinutes: number;
  averageFocus: number;
  tasksCompleted: number;
  streakDays: number;
}

import { TokenService, TokenPayload } from '@/services/auth/token-service';

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
      // Get aggregated stats efficiently and session dates for streak
      const [stats, sessions] = await Promise.all([
        prisma.studySession.aggregate({
          where: { userId },
          _sum: {
            durationMin: true,
          },
          _avg: {
            focusScore: true,
          },
        }),
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

      const totalMinutes = stats._sum.durationMin || 0;
      const averageFocus = stats._avg.focusScore || 0;

      // Count completed tasks
      const tasksCompleted = await prisma.task.count({
        where: {
          userId,
          status: 'COMPLETED',
        },
      });

      // Calculate current streak optimized (O(N) linear scan)
      let streakDays = 0;
      if (sessions.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const latestSessionDate = new Date(sessions[0].createdAt);
        latestSessionDate.setHours(0, 0, 0, 0);

        // Streak is active if the last session was today or yesterday
        if (latestSessionDate.getTime() === today.getTime() || latestSessionDate.getTime() === yesterday.getTime()) {
          streakDays = 1;
          let lastDateProcessed = latestSessionDate;

          for (let i = 1; i < sessions.length; i++) {
            const sessionDate = new Date(sessions[i].createdAt);
            sessionDate.setHours(0, 0, 0, 0);

            // Skip multiple sessions on the same day
            if (sessionDate.getTime() === lastDateProcessed.getTime()) {
              continue;
            }

            // Check if this session is exactly one day before the last processed day
            const expectedPreviousDate = new Date(lastDateProcessed);
            expectedPreviousDate.setDate(expectedPreviousDate.getDate() - 1);

            if (sessionDate.getTime() === expectedPreviousDate.getTime()) {
              streakDays++;
              lastDateProcessed = sessionDate;
            } else {
              // Gap found, streak ends
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

