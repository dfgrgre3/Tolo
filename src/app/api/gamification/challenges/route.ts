import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/advanced-gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET /api/gamification/challenges - Get active challenges
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as 'daily' | 'weekly' | 'monthly' | null;

    if (userId) {
      // Get user's challenges with progress
      const challenges = await advancedGamificationService.getUserChallenges(userId);
      return NextResponse.json({ challenges });
    } else {
      // Get all active challenges
      const challenges = await advancedGamificationService.getActiveChallenges(undefined, type || undefined);
      return NextResponse.json({ challenges });
    }
  } catch (error: any) {
    logger.error('Error fetching challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges', details: error.message },
      { status: 500 }
    );
    }
  });
}

