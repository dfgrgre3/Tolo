import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/services/advanced-gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET /api/gamification/seasons/[seasonId]/leaderboard - Get season leaderboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { seasonId } = await params;
      const { searchParams } = new URL(req.url);
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
    } catch (error: unknown) {
      logger.error('Error fetching season leaderboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { error: 'Failed to fetch season leaderboard', details: errorMessage },
        { status: 500 }
      );
    }
  });
}

