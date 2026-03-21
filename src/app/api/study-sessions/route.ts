import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db-unified';
import { CacheService as LegacyCacheService } from '@/lib/redis';
import { CacheService } from '@/lib/cache-service-unified';
import { startOfWeek } from 'date-fns';
import { gamificationService } from '@/lib/services/gamification-service';
import { firestoreService } from '@/lib/services/firestore-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { successResponse, unauthorizedResponse, badRequestResponse, withAuth, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const { searchParams } = new URL(req.url);
        const limit = searchParams.get('limit') || '10';
        const offset = searchParams.get('offset') || '0';

        // Use cache key based on user and parameters
        const cacheKey = `study_sessions_${authUser.userId}_limit_${limit}_offset_${offset}`;

        const sessions = await LegacyCacheService.getOrSet(cacheKey, async () => {
          return await prisma.studySession.findMany({
            where: {
              userId: authUser.userId,
            },
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: {
              startTime: 'desc',
            },
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
                select: {
                  id: true,
                  name: true,
                  icon: true,
                  color: true
                }
              }
            }
          });
        }, 300); // Cache for 5 minutes

        return successResponse(sessions);
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
        const body = await request.json();

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

        // Trigger gamification for study session completion
        try {
          const updatedProgress = await gamificationService.updateUserProgress(
            authUser.userId,
            'study_session_completed',
            { duration: body.durationMin || 0 }
          );

          // Update Firestore with new progress
          await firestoreService.updateUserProgress(authUser.userId, {
            totalXP: updatedProgress.totalXP,
            level: updatedProgress.level,
            currentStreak: updatedProgress.currentStreak,
            longestStreak: updatedProgress.longestStreak,
            totalStudyTime: updatedProgress.totalStudyTime,
            tasksCompleted: updatedProgress.tasksCompleted,
            examsPassed: updatedProgress.examsPassed,
            achievements: updatedProgress.achievements
          });

          // Send achievement notifications if any were unlocked
          // Check for newly unlocked achievements by comparing current achievements with previous user state
          if (updatedProgress.achievements && Array.isArray(updatedProgress.achievements)) {
            try {
              // Get user's previous achievements from database to compare
              const user = await prisma.user.findUnique({
                where: { id: authUser.userId },
                select: { achievements: { select: { achievementKey: true } } }
              });

              const previousAchievementKeys = new Set(
                user?.achievements?.map(ua => ua.achievementKey) || []
              );

              const newAchievementKeys = updatedProgress.achievements.filter(
                (achievementKey: string) => !previousAchievementKeys.has(achievementKey)
              );

              for (const achievementKey of newAchievementKeys) {
                const achievement = await prisma.achievement.findUnique({
                  where: { key: achievementKey }
                });

                if (achievement) {
                  await firestoreService.sendAchievementNotification(
                    authUser.userId,
                    {
                      key: achievement.key,
                      title: achievement.title,
                      description: achievement.description,
                      icon: achievement.icon,
                      xpReward: achievement.xpReward
                    }
                  );
                }
              }
            } catch (notificationError) {
              logger.error('Error sending achievement notifications:', notificationError);
              // Don't fail the request if notification sending fails
            }
          }
        } catch (gamificationError) {
          logger.error('Error updating gamification:', gamificationError);
          // Don't fail the request if gamification fails
        }

        // Invalidate user's study sessions cache
        await LegacyCacheService.invalidatePattern(`study_sessions_${authUser.userId}*`);

        // Invalidate user's analytics cache
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 });
        const analyticsCacheKey = `analytics:weekly:${authUser.userId}:${weekStart.toISOString()}`;
        await CacheService.del(analyticsCacheKey);

        // Invalidate user's progress cache
        const progressCacheKey = `progress:${authUser.userId}`;
        await CacheService.del(progressCacheKey);

        return successResponse(session);
      } catch (error) {
        logger.error('Error creating study session:', error);
        return handleApiError(error);
      }
    });
  });
}
