import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/services/advanced-gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET /api/gamification/rewards - Get user rewards
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      const rewards = await advancedGamificationService.getUserRewards(userId);

      return NextResponse.json({ rewards });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching rewards:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rewards', details: errorMessage },
        { status: 500 }
      );
    }
  });
}

// POST /api/gamification/rewards - Award a reward
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
      const { userId, rewardId, source, nftTokenId } = body;

      if (!userId || !rewardId || !source) {
        return NextResponse.json(
          { error: 'User ID, reward ID, and source are required' },
          { status: 400 }
        );
      }

      await advancedGamificationService.awardReward(
        userId,
        rewardId,
        source,
        nftTokenId
      );

      return NextResponse.json({
        success: true,
        message: 'تم منح المكافأة بنجاح'
      });
    } catch (error: unknown) {
      logger.error('Error awarding reward:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: 'Failed to award reward', details: errorMessage },
        { status: 500 }
      );
    }
  });
}

