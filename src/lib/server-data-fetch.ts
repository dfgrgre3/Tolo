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
      // Run queries in parallel for better performance
      const [stats, tasksCompleted, sessions] = await Promise.all([
        // Aggregate stats directly in DB (faster than fetching all records)
        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMin: true },
          _avg: { focusScore: true },
        }),
        // Count completed tasks
        prisma.task.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        }),
        // Fetch only dates for streak calculation (sorted desc for linear scan)
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const totalMinutes = stats._sum.durationMin || 0;
      const averageFocus = stats._avg.focusScore || 0;

      // Calculate streak - optimized O(N) linear scan on sorted dates
      let streakDays = 0;
      if (sessions.length > 0) {
        streakDays = 1;
        const lastSessionDate = new Date(sessions[0].createdAt);
        lastSessionDate.setHours(0, 0, 0, 0);

        let currentDate = lastSessionDate;

        for (let i = 1; i < sessions.length; i++) {
          const sessionDate = new Date(sessions[i].createdAt);
          sessionDate.setHours(0, 0, 0, 0);

          const diffTime = currentDate.getTime() - sessionDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            continue; // Same day
          } else if (diffDays === 1) {
            streakDays++;
            currentDate = sessionDate;
          } else {
            break; // Gap > 1 day, streak broken
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
