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
      const [aggregations, tasksCompleted, sessionDates] = await Promise.all([
        // Get sums and averages directly from the database (much faster than fetching all records)
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

        // Fetch ONLY dates for streak calculation (saves bandwidth and memory)
        prisma.studySession.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        })
      ]);

      const totalMinutes = aggregations._sum.durationMin || 0;
      // Handle average focus (prisma returns null if no sessions)
      const averageFocus = aggregations._avg.focusScore || 0;

      // Calculate current streak
      // Optimized logic: O(N) using a Set instead of O(N^2) or O(N*Streak)
      let streakDays = 0;
      if (sessionDates.length > 0) {
        // Use a Set for O(1) lookups
        const uniqueDates = new Set<string>();

        sessionDates.forEach(session => {
          const d = new Date(session.createdAt);
          d.setHours(0, 0, 0, 0);
          uniqueDates.add(d.toDateString());
        });

        // The logic assumes ascending order, so the last element is the most recent
        const lastSessionDate = new Date(sessionDates[sessionDates.length - 1].createdAt);
        lastSessionDate.setHours(0, 0, 0, 0);

        const currentDate = new Date(); // Today
        currentDate.setHours(0, 0, 0, 0);

        // Check if the user studied today or yesterday relative to REAL time
        // The original logic compared the last session date against ITSELF which is weird,
        // effectively checking if the last session date is equal to the last session date.
        // HOWEVER, it created 'currentDate' from the LAST SESSION.
        // So it checked if the last session exists. Yes.
        // Then it checked backwards.

        // Let's stick to the behavior: Start counting from the LAST SESSION DATE backwards.
        // This calculates the streak ENDING at the last session.
        // If the last session was 5 days ago, the streak is still calculated as if it ended then?
        // Wait, the original code:
        /*
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const currentDate = new Date(sessions[sessions.length - 1].createdAt);
          ...
          // It calculates streak relative to 'currentDate' (last session).
          // It does NOT check if 'currentDate' is today or yesterday relative to real time to VALIDATE the streak.
          // It simply calculates the length of the streak ending at the last session.
        */

        // We will replicate exactly that behavior to be safe.
        streakDays = 1;
        const checkDate = new Date(lastSessionDate);

        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (uniqueDates.has(checkDate.toDateString())) {
            streakDays++;
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
