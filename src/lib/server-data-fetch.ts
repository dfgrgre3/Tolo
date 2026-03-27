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
      // Parallelize queries for better performance
      // 1. Get Aggregates (Sum, Avg) from DB directly
      // 2. Get Task Count
      // 3. Get only session dates for streak calculation (sorted desc)
      const [aggregates, tasksCompleted, sessionDates] = await Promise.all([
        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMin: true },
          _avg: { focusScore: true },
        }),
        prisma.task.count({
          where: { userId, status: 'COMPLETED' },
        }),
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const totalMinutes = aggregates._sum.durationMin || 0;
      const averageFocus = aggregates._avg.focusScore || 0;

      // Calculate streak
      let streakDays = 0;
      if (sessionDates.length > 0) {
        // Normalize dates to midnight to handle streaks correctly
        const normalize = (d: Date) => {
          const newD = new Date(d);
          newD.setHours(0, 0, 0, 0);
          return newD.getTime();
        };

        const lastSessionDate = normalize(sessionDates[0].createdAt);
        streakDays = 1;
        let currentDate = lastSessionDate;

        // Iterate through dates (sorted desc: latest first)
        for (let i = 1; i < sessionDates.length; i++) {
          const sessionDate = normalize(sessionDates[i].createdAt);

          if (sessionDate === currentDate) {
            continue; // Same day, ignore
          }

          // Check if this session is exactly one day before current date
          const expectedPrevDay = new Date(currentDate);
          expectedPrevDay.setDate(expectedPrevDay.getDate() - 1);

          if (sessionDate === expectedPrevDay.getTime()) {
            streakDays++;
            currentDate = sessionDate;
          } else {
            // Gap found, streak ends
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

