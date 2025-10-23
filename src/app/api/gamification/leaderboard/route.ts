import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/gamification-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'global' | 'friends' || 'global';
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId'); // To highlight current user

    if (limit > 100) {
      return NextResponse.json({ error: 'Limit cannot exceed 100' }, { status: 400 });
    }

    // Get leaderboard data
    const leaderboard = await gamificationService.getLeaderboard(type, limit);

    // If userId is provided, find their position
    let userPosition = null;
    if (userId) {
      const userIndex = leaderboard.findIndex(entry => entry.userId === userId);
      if (userIndex !== -1) {
        userPosition = {
          rank: leaderboard[userIndex].rank,
          totalXP: leaderboard[userIndex].totalXP,
          level: leaderboard[userIndex].level
        };
      }
    }

    return NextResponse.json({
      leaderboard,
      userPosition,
      type,
      totalEntries: leaderboard.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
