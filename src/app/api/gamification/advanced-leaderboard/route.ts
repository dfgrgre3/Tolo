import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/services/advanced-gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET /api/gamification/advanced-leaderboard - Get advanced leaderboard
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
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
    } catch (error: unknown) {
      logger.error('Error fetching advanced leaderboard:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard', details: errorMessage },
        { status: 500 }
      );
    }
  });
}

