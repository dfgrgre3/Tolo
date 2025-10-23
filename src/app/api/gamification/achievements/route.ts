import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/gamification-service';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user progress with achievements
    const progress = await gamificationService.getUserProgress(userId);

    // Get all available achievements
    const allAchievements = gamificationService.getAllAchievements();

    // Filter achievements based on query parameters
    let filteredAchievements = allAchievements;

    if (category) {
      filteredAchievements = filteredAchievements.filter(a => a.category === category);
    }

    if (difficulty) {
      filteredAchievements = filteredAchievements.filter(a => a.difficulty === difficulty);
    }

    // Mark which achievements are earned by the user
    const achievementsWithStatus = filteredAchievements.map(achievement => ({
      ...achievement,
      isEarned: progress.achievements.includes(achievement.key),
      earnedAt: progress.achievements.includes(achievement.key) ?
        // In a real implementation, you'd get the actual earned date from the database
        new Date().toISOString() : null
    }));

    return NextResponse.json({
      achievements: achievementsWithStatus,
      userProgress: {
        totalXP: progress.totalXP,
        level: progress.level,
        achievementsCount: progress.achievements.length,
        totalAchievements: allAchievements.length
      }
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    console.error('Error in achievements API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
