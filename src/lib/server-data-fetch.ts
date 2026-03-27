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
      const [stats, taskCount, sessions] = await Promise.all([
        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMin: true },
          _avg: { focusScore: true },
        }),
        prisma.task.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        }),
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const totalMinutes = stats._sum.durationMin || 0;
      const averageFocus = stats._avg.focusScore || 0;
      const tasksCompleted = taskCount;

      // Calculate current streak using optimized O(N) approach
      let streakDays = 0;
      if (sessions.length > 0) {
        // Use a Set for O(1) lookups of study dates
        const uniqueDates = new Set<number>();
        sessions.forEach((s) => {
          const d = new Date(s.createdAt);
          d.setHours(0, 0, 0, 0);
          uniqueDates.add(d.getTime());
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayTime = yesterday.getTime();

        let checkDate: Date | null = null;

        if (uniqueDates.has(todayTime)) {
          streakDays = 1;
          checkDate = yesterday;
        } else if (uniqueDates.has(yesterdayTime)) {
          streakDays = 1;
          checkDate = new Date(yesterday);
          checkDate.setDate(checkDate.getDate() - 1);
        }

        if (streakDays > 0 && checkDate) {
          while (true) {
            checkDate.setHours(0, 0, 0, 0);
            if (uniqueDates.has(checkDate.getTime())) {
              streakDays++;
              checkDate.setDate(checkDate.getDate() - 1);
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

