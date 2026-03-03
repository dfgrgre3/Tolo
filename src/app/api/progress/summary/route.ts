import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CacheService } from '@/lib/redis';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import { TaskStatus } from '@/lib/constants';
import { successResponse, badRequestResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId');

      if (!userId || userId === 'undefined') {
        return badRequestResponse('User ID is required');
      }

      // Use enhanced caching for progress summary with longer TTL
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

        // Type for selected study session fields
        type StudySessionSummary = Pick<Prisma.StudySessionGetPayload<{
          select: { durationMin: true; focusScore: true; createdAt: true }
        }>, 'durationMin' | 'focusScore' | 'createdAt'>;

        // Calculate total minutes
        const totalMinutes = sessions.reduce(
          (sum: number, session: StudySessionSummary) => sum + (session.durationMin || 0),
          0
        );

        // Calculate average focus
        const focusSessions = sessions.filter(
          (session: StudySessionSummary) => session.focusScore !== null
        );
        const averageFocus =
          focusSessions.length > 0
            ? focusSessions.reduce(
              (sum: number, session: StudySessionSummary) => sum + (session.focusScore || 0),
              0
            ) / focusSessions.length
            : 0;

        // Count completed tasks
        const tasksCompleted = await prisma.task.count({
          where: {
            userId,
            status: TaskStatus.COMPLETED,
          },
        });

        // Calculate current streak
        let streakDays = 0;
        if (sessions.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let currentDate = new Date(sessions[sessions.length - 1].createdAt);
          currentDate.setHours(0, 0, 0, 0);

          let previousDate = new Date(currentDate);
          previousDate.setDate(previousDate.getDate() - 1);

          // Check if the user studied today or yesterday
          const studiedToday = sessions.some((session: StudySessionSummary) => {
            const sessionDate = new Date(session.createdAt);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === currentDate.getTime();
          });

          if (studiedToday) {
            streakDays = 1;

            // Count consecutive days
            let checkDate = new Date(currentDate);
            let found = true;

            while (found) {
              checkDate.setDate(checkDate.getDate() - 1);
              found = sessions.some((session: StudySessionSummary) => {
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
      }, 600); // Cache for 10 minutes (enhanced caching)

      return successResponse(summary);
    } catch (error) {
      logger.error('Error fetching progress summary:', error);
      return handleApiError(error);
    }
  });
}

// Add POST method for cache invalidation
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
      const { userId, action } = body;

      if (!userId) {
        return badRequestResponse('User ID is required');
      }

      // Only invalidate cache when requested
      if (action === 'invalidate-cache') {
        const cacheKey = `progress_summary_${userId}`;
        await CacheService.del(cacheKey);

        return successResponse({ message: 'Progress summary cache invalidated successfully' });
      }

      return badRequestResponse('Invalid action');
    } catch (error) {
      logger.error('Error invalidating progress summary cache:', error);
      return handleApiError(error);
    }
  });
}