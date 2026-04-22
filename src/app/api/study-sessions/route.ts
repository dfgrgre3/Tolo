import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { CacheService as LegacyCacheService } from '@/lib/redis';
import { CacheService } from '@/lib/cache-service-unified';
import { startOfWeek } from 'date-fns';
import { gamificationService } from '@/services/gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { successResponse, badRequestResponse, withAuth, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const cursor = searchParams.get('cursor');

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return badRequestResponse('Invalid limit parameter');
    }

    // Function to fetch and cache sessions
    const getSessionsPayload = async (userId: string) => {
      const cacheKey = cursor
        ? `study_sessions_${userId}_cursor_${cursor}_limit_${limit}`
        : `study_sessions_${userId}_limit_${limit}_offset_${offset}`;

      return LegacyCacheService.getOrSet(cacheKey, async () => {
        const fetchedSessions = await prisma.studySession.findMany({
          where: { userId },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip: offset }),
          orderBy: [{ startTime: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            userId: true,
            subjectId: true,
            startTime: true,
            endTime: true,
            durationMin: true,
            focusScore: true,
            notes: true,
            strategy: true,
            createdAt: true,
            subject: {
              select: { id: true, name: true, icon: true, color: true }
            }
          }
        });

        const hasMore = fetchedSessions.length > limit;
        const sessions = hasMore ? fetchedSessions.slice(0, limit) : fetchedSessions;

        return {
          sessions,
          hasMore,
          nextCursor: hasMore ? sessions[sessions.length - 1]?.id ?? null : null,
        };
      }, 300);
    };

    // If userId provided in query (for guest users)
    if (queryUserId && queryUserId !== 'undefined' && queryUserId.trim() !== '') {
      try {
        const payload = await getSessionsPayload(queryUserId);
        return successResponse(payload);
      } catch (error) {
        return handleApiError(error);
      }
    }

    // Fallback to authentication
    return withAuth(req, async (authUser) => {
      try {
        const payload = await getSessionsPayload(authUser.userId);
        return successResponse(payload);
      } catch (error) {
        logger.error('Error fetching study sessions:', error);
        return handleApiError(error);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const body = await req.json();

        const now = new Date();
        const startTime = body.startTime ? new Date(body.startTime) : new Date(now.getTime() - (body.durationMin ?? 0) * 60000);
        const endTime = body.endTime ? new Date(body.endTime) : now;

        if (!body.subjectId) return badRequestResponse('subjectId required');

        const session = await prisma.studySession.create({
          data: {
            userId: authUser.userId,
            subjectId: body.subjectId,
            startTime,
            endTime,
            durationMin: Math.max(1, body.durationMin ?? 1),
            notes: body.notes ?? null,
            strategy: body.strategy ?? null,
          },
        });

        try {
          await gamificationService.updateUserProgress(
            authUser.userId,
            'study_session_completed',
            { duration: body.durationMin || 0 }
          );
        } catch (gamificationError) {
          logger.error('Error updating gamification:', gamificationError);
        }

        try {
          const { sendMultiChannelNotification } = await import('@/services/notification-sender');
          await sendMultiChannelNotification({
            userId: authUser.userId,
            title: 'انتهت جلسة المذاكرة',
            message: `لقد أتممت ${body.durationMin || 0} دقيقة من المذاكرة المركزة. تابع التقدم!`,
            type: 'success',
            icon: '✅',
            channels: ['app']
          });
        } catch (notificationError) {
          logger.error('Failed to send study session notification:', notificationError);
        }

        await LegacyCacheService.invalidatePattern(`study_sessions_${authUser.userId}*`);
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 });
        await CacheService.del(`analytics:weekly:${authUser.userId}:${weekStart.toISOString()}`);
        await CacheService.del(`progress:${authUser.userId}`);

        return successResponse(session);
      } catch (error) {
        logger.error('Error creating study session:', error);
        return handleApiError(error);
      }
    });
  });
}
