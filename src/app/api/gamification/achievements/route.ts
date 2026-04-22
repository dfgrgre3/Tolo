import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/services/gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';

import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (_req) => {
    try {
      logger.info('Achievements API called');

      // Simple test response first
      return successResponse({
        achievements: [],
        userProgress: {
          totalXP: 0,
          level: 1,
          achievementsCount: 0,
          totalAchievements: 0
        }
      });

      // Original code commented out for debugging
      /*
      const { searchParams } = new URL(req.url);
      const category = searchParams.get('category');
      const difficulty = searchParams.get('difficulty');
      const userIdParam = searchParams.get('userId');
        // Try to get authenticated user first, fallback to guest user
      let userId: string | null = null;
        // Check if we have authentication headers
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      const userIdHeader = req.headers.get('x-user-id');
        if (userIdHeader) {
        // User is authenticated via middleware
        userId = userIdHeader;
      } else if (authHeader) {
        // Try to validate the token and get user ID
        try {
          const { TokenService } = await import('@/services/auth/token-service');
          const token = authHeader.replace('Bearer ', '').trim();
          const payload = await TokenService.verifyToken<{ userId?: string }>(token);
          if (payload?.userId) {
            userId = payload.userId;
          }
        } catch (tokenError) {
          // Token invalid, continue to guest flow
        }
      }
        // If still no userId, try from params or create guest user
      if (!userId) {
        if (userIdParam) {
          userId = userIdParam;
        } else {
          userId = await ensureUser();
        }
      }
        if (!userId) {
        return badRequestResponse('User identification required');
      }
        return await handleAchievementsRequest(userId, category, difficulty);
      */






    } catch (error) {
      logger.error('Error in achievements API:', error);
      return handleApiError(error);
    }
  });
}

async function _handleAchievementsRequest(
userId: string,
category: string | null,
difficulty: string | null)
: Promise<NextResponse> {
  try {
    logger.info(`Fetching achievements for user: ${userId}`);

    // Check if gamificationService is available
    if (!gamificationService) {
      logger.error('Gamification service is not available');
      return badRequestResponse('Gamification service not available');
    }

    // Get all available achievements first
    let allAchievements;
    try {
      allAchievements = await gamificationService.getAllAchievements();
      logger.info(`Found ${allAchievements.length} total achievements`);
    } catch (error) {
      logger.error('Error getting all achievements:', error);
      throw new Error(`Failed to get achievements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Get user progress
    let progress;
    try {
      progress = await gamificationService.getUserProgress(userId);
      logger.info(`User progress loaded for ${userId}, level: ${progress.level}, XP: ${progress.totalXP}`);
    } catch (error) {
      logger.error('Error getting user progress:', error);
      throw new Error(`Failed to get user progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const userAchievements = progress.achievements || [];

    const userProgressData = {
      totalXP: progress.totalXP || 0,
      level: progress.level || 1,
      achievementsCount: userAchievements.length,
      totalAchievements: allAchievements.length
    };

    // Filter achievements based on query parameters
    let filteredAchievements = allAchievements;

    if (category) {
      filteredAchievements = filteredAchievements.filter((a: any) => a.category === category);
    }

    if (difficulty) {
      filteredAchievements = filteredAchievements.filter((a: any) => a.difficulty === difficulty);
    }

    // Mark which achievements are earned by user
    const achievementsWithStatus = filteredAchievements.map((achievement: any) => ({
      ...achievement,
      isEarned: userAchievements.includes(achievement.key),
      earnedAt: userAchievements.includes(achievement.key) ? new Date().toISOString() : null
    }));

    logger.info(`Returning ${achievementsWithStatus.length} achievements for user ${userId}`);

    return successResponse({
      achievements: achievementsWithStatus,
      userProgress: userProgressData
    });
  } catch (error) {
    logger.error('Error in handleAchievementsRequest:', error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (_req) => {
    return withAuth(request, async (authUser) => {
      try {
        const body = await request.json();
        const { action, data } = body;

        if (!action) {
          return badRequestResponse('Action is required');
        }

        const userId = authUser.userId;
        let result;

        switch (action) {
          case 'unlock_achievement':
            if (!data?.achievementKey) {
              return badRequestResponse('Achievement key is required');
            }

            const achievement = await gamificationService.getAchievement(data.achievementKey);
            if (!achievement) {
              return badRequestResponse('Achievement not found');
            }

            await gamificationService.unlockAchievement(userId, achievement.key);
            result = { message: 'Achievement unlocked successfully' };
            break;

          case 'check_achievements':
            result = await gamificationService.getUserProgress(userId);
            break;

          default:
            return badRequestResponse('Invalid action');
        }

        return successResponse(result);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
