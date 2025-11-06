import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/advanced-gamification-service';

// GET /api/gamification/quests - Get active quest chains
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const chainId = searchParams.get('chainId');

    if (userId && chainId) {
      // Get quest progress for a specific chain
      const quests = await advancedGamificationService.getQuestProgress(userId, chainId);
      return NextResponse.json({ quests, chainId });
    } else {
      // Get all active quest chains
      const chains = await advancedGamificationService.getActiveQuestChains(userId || undefined);
      return NextResponse.json({ chains });
    }
  } catch (error: any) {
    console.error('Error fetching quests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quests', details: error.message },
      { status: 500 }
    );
  }
}

