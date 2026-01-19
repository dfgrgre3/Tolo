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
      const [sessionStats, sessions, tasksCompleted] = await Promise.all([
        // 1. Get aggregated statistics directly from DB
        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMin: true },
          _avg: { focusScore: true },
        }),
        // 2. Get sessions dates for streak calculation (sorted DESC)
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        // 3. Count completed tasks
        prisma.task.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        })
      ]);

      const totalMinutes = sessionStats._sum.durationMin || 0;
      const averageFocus = sessionStats._avg.focusScore || 0;

      // Calculate current streak - Optimized O(N) algorithm
      let streakDays = 0;
      if (sessions.length > 0) {
        // sessions[0] is the latest session (sorted DESC)
        const lastSessionDate = new Date(sessions[0].createdAt);
        lastSessionDate.setHours(0, 0, 0, 0);

        // Check if the user studied today or yesterday relative to the last session
        // Note: The original logic anchored streak to the last session date.
        // If we want to check if the streak is *active* (i.e. includes today or yesterday),
        // we should compare lastSessionDate to today.

        // However, to preserve exact behavior of original code:
        // Original code used `currentDate = sessions[last].createdAt` as anchor.
        // So we just calculate the consecutive streak ending at the last session.

        // Wait, original code:
        // const currentDate = new Date(sessions[sessions.length - 1].createdAt);
        // ...
        // const studiedToday = sessions.some(...) // Checks if *any* session matches currentDate.

        // This effectively just sets the anchor to the last session.

        streakDays = 1;
        const expectedDate = new Date(lastSessionDate);
        expectedDate.setDate(expectedDate.getDate() - 1); // Expect the day before

        // Iterate through sessions (starting from 2nd one)
        for (let i = 1; i < sessions.length; i++) {
          const sessionDate = new Date(sessions[i].createdAt);
          sessionDate.setHours(0, 0, 0, 0);
          const sessionTime = sessionDate.getTime();
          const expectedTime = expectedDate.getTime();

          if (sessionTime === expectedTime) {
            // Found the expected previous day, increment streak and move expectation back
            streakDays++;
            expectedDate.setDate(expectedDate.getDate() - 1);
          } else if (sessionTime < expectedTime) {
            // Gap detected, streak ends
            break;
          }
          // If sessionTime > expectedTime, it means multiple sessions on the same day (or we are traversing wrong, but we sorted DESC)
          // Since we sorted DESC, dates should be decreasing.
          // If sessionTime > expectedTime, it means we are still on the same day as previous loop (duplicate day).
          // So we just continue.
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
