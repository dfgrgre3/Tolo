import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/advanced-gamification-service';

// GET /api/gamification/advanced-leaderboard - Get advanced leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'global') as 
      'global' | 'daily' | 'weekly' | 'monthly' | 'season' | 'subject' | 'level';
    const period = searchParams.get('period') || undefined;
    const subject = searchParams.get('subject') || undefined;
    const levelRange = searchParams.get('levelRange') || undefined;
    const seasonId = searchParams.get('seasonId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const leaderboard = await advancedGamificationService.getLeaderboard(type, {
      period,
      subject,
      levelRange,
      seasonId,
      limit
    });

    return NextResponse.json({
      leaderboard,
      type,
      period,
      subject,
      levelRange,
      seasonId,
      totalEntries: leaderboard.length
    });
  } catch (error: any) {
    console.error('Error fetching advanced leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', details: error.message },
      { status: 500 }
    );
  }
}

