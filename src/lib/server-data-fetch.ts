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

/**
 * Get user ID from server-side (cookies or session)
 */
async function getServerUserId(): Promise<string | null> {
  try {
    // Try to get authenticated user first
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || cookieStore.get('access_token')?.value;

    if (token) {
      const payload: any = { userId: "default-user" };
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
      // Get all study sessions for the user
      const sessions = await prisma.studySession.findMany({
        where: { userId },
        select: {
          durationMin: true,
          focusScore: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Calculate total minutes
      const totalMinutes = sessions.reduce(
        (sum: number, session) => sum + (session.durationMin || 0),
        0
      );

      // Calculate average focus
      const focusSessions = sessions.filter(
        (session) => session.focusScore !== null
      );
      const averageFocus =
        focusSessions.length > 0
          ? focusSessions.reduce(
            (sum: number, session) => sum + (session.focusScore || 0),
            0
          ) / focusSessions.length
          : 0;

      // Count completed tasks
      const tasksCompleted = await prisma.task.count({
        where: {
          userId,
          status: 'COMPLETED',
        },
      });

      // Calculate current streak
      let streakDays = 0;
      if (sessions.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentDate = new Date(sessions[sessions.length - 1].createdAt);
        currentDate.setHours(0, 0, 0, 0);

        // Check if the user studied today or yesterday
        const studiedToday = sessions.some((session) => {
          const sessionDate = new Date(session.createdAt);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === currentDate.getTime();
        });

        if (studiedToday) {
          streakDays = 1;

          // Count consecutive days
          const checkDate = new Date(currentDate);
          let found = true;

          while (found) {
            checkDate.setDate(checkDate.getDate() - 1);
            found = sessions.some((session) => {
              const sessionDate = new Date(session.createdAt);
              sessionDate.setHours(0, 0, 0, 0);
              return sessionDate.getTime() === checkDate.getTime();
            });

            if (found) {
              streakDays++;
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

