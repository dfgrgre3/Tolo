import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/advanced-gamification-service';

// GET /api/gamification/seasons/[seasonId]/leaderboard - Get season leaderboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const leaderboard = await advancedGamificationService.getSeasonLeaderboard(
      seasonId,
      limit
    );

    return NextResponse.json({
      leaderboard,
      seasonId,
      totalEntries: leaderboard.length
    });
  } catch (error: any) {
    console.error('Error fetching season leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season leaderboard', details: error.message },
      { status: 500 }
    );
  }
}

