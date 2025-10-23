import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCachedOrFetch, invalidateCachePattern } from '@/lib/db-service';
import { CacheService } from '@/lib/redis';
import { startOfWeek } from 'date-fns';
import { gamificationService } from '@/lib/gamification-service';
import { firestoreService } from '@/lib/firestore-service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';

    // Use cache key based on user and parameters
    const cacheKey = `study_sessions_${decodedToken.userId}_limit_${limit}_offset_${offset}`;

    const sessions = await getCachedOrFetch(cacheKey, async () => {
      return await prisma.studySession.findMany({
        where: {
          userId: decodedToken.userId,
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: {
          startTime: 'desc',
        },
        include: {
          task: {
            select: {
              title: true,
            }
          }
        }
      });
    }, 300); // Cache for 5 minutes

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching study sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch study sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const session = await prisma.studySession.create({
      data: {
        ...body,
        userId: decodedToken.userId,
      },
    });

    // Trigger gamification for study session completion
    try {
      const updatedProgress = await gamificationService.updateUserProgress(
        decodedToken.userId,
        'study_session_completed',
        { duration: body.durationMin || 0 }
      );

      // Update Firestore with new progress
      await firestoreService.updateUserProgress(decodedToken.userId, {
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
      const newAchievements = updatedProgress.achievements.filter(
        achievement => !session.achievements?.includes(achievement)
      );

      for (const achievementKey of newAchievements) {
        const achievement = gamificationService.getAchievement(achievementKey);
        if (achievement) {
          await firestoreService.sendAchievementNotification(
            decodedToken.userId,
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
    } catch (gamificationError) {
      console.error('Error updating gamification:', gamificationError);
      // Don't fail the request if gamification fails
    }

    // Invalidate user's study sessions cache
    await invalidateCachePattern(`study_sessions_${decodedToken.userId}*`);

    // Invalidate user's analytics cache
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 });
    const analyticsCacheKey = `analytics:weekly:${decodedToken.userId}:${weekStart.toISOString()}`;
    await CacheService.del(analyticsCacheKey);

    // Invalidate user's progress cache
    const progressCacheKey = `progress:${decodedToken.userId}`;
    await CacheService.del(progressCacheKey);

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error creating study session:', error);
    return NextResponse.json(
      { error: 'Failed to create study session' },
      { status: 500 }
    );
  }
}
