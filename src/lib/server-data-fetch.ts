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
      // ⚡ Bolt Optimization: Fetch pre-calculated stats from User model instead of aggregating millions of rows
      // Also use DB-level aggregation for average focus instead of loading all sessions into memory

      const [user, focusStats] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            totalStudyTime: true,
            tasksCompleted: true,
            currentStreak: true,
          }
        }),
        prisma.studySession.aggregate({
          where: {
            userId,
          },
          _avg: {
            focusScore: true
          }
        })
      ]);

      if (!user) {
        return {
          totalMinutes: 0,
          averageFocus: 0,
          tasksCompleted: 0,
          streakDays: 0,
        };
      }

      return {
        totalMinutes: user.totalStudyTime || 0,
        averageFocus: Math.round((focusStats._avg.focusScore || 0) * 100) / 100,
        tasksCompleted: user.tasksCompleted || 0,
        streakDays: user.currentStreak || 0,
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

