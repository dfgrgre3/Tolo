import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/services/gamification-service';
import { prisma as db } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId');
      const category = searchParams.get('category');
      const difficulty = searchParams.get('difficulty');

      if (!userId || userId.trim() === '') {
        return NextResponse.json(
          {
            error: 'User ID is required',
            achievements: [],
            userProgress: null
          },
          { status: 400 }
        );
      }

      // Get all available achievements first (this always works)
      const allAchievements = gamificationService.getAllAchievements();

      // Try to get user progress, but handle errors gracefully
      let progress;
      let userAchievements: string[] = [];
      let userProgressData = {
        totalXP: 0,
        level: 1,
        achievementsCount: 0,
        totalAchievements: allAchievements.length
      };

      try {
        progress = await gamificationService.getUserProgress(userId);
        userAchievements = progress.achievements || [];
        userProgressData = {
          totalXP: progress.totalXP || 0,
          level: progress.level || 1,
          achievementsCount: userAchievements.length,
          totalAchievements: allAchievements.length
        };
      } catch (progressError: unknown) {
        // If user doesn't exist or other error, continue with empty progress
        const errorMessage = progressError instanceof Error ? progressError.message : String(progressError);
        logger.warn('Could not fetch user progress, using defaults:', errorMessage);
        // Continue with default values
      }

      // Filter achievements based on query parameters
      let filteredAchievements = allAchievements;

      if (category) {
        filteredAchievements = filteredAchievements.filter((a) => a.category === category);
      }

      if (difficulty) {
        filteredAchievements = filteredAchievements.filter((a) => a.difficulty === difficulty);
      }

      // Mark which achievements are earned by the user
      const achievementsWithStatus = filteredAchievements.map((achievement) => ({
        ...achievement,
        isEarned: userAchievements.includes(achievement.key),
        earnedAt: userAchievements.includes(achievement.key) ?
          // In a real implementation, you'd get the actual earned date from the database
          new Date().toISOString() : null
      }));

      return NextResponse.json({
        achievements: achievementsWithStatus,
        userProgress: userProgressData
      });

    } catch (error: unknown) {
      logger.error('Error fetching achievements:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Return a safe fallback response
      const allAchievements = gamificationService.getAllAchievements();
      return NextResponse.json({
        error: errorMessage || 'Failed to fetch achievements',
        achievements: allAchievements.map((ach) => ({
          ...ach,
          isEarned: false,
          earnedAt: null
        })),
        userProgress: {
          totalXP: 0,
          level: 1,
          achievementsCount: 0,
          totalAchievements: allAchievements.length
        }
      }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
      const { userId, action, data } = body;

      if (!userId || !action) {
        return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
      }

      let result;

      switch (action) {
        case 'unlock_achievement':
          if (!data?.achievementKey) {
            return NextResponse.json({ error: 'Achievement key is required' }, { status: 400 });
          }

          const achievement = gamificationService.getAchievement(data.achievementKey);
          if (!achievement) {
            return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
          }

          await gamificationService.unlockAchievement(userId, achievement);
          result = { message: 'Achievement unlocked successfully' };
          break;

        case 'check_achievements':
          // This would check and potentially unlock new achievements based on user progress
          result = await gamificationService.getUserProgress(userId);
          break;

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      return NextResponse.json(result);

    } catch (error) {
      logger.error('Error in achievements API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
