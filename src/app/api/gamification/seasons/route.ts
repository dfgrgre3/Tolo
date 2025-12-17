import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/services/advanced-gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET /api/gamification/seasons - Get active season
export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
      const season = await advancedGamificationService.getActiveSeason();

      if (!season) {
        return NextResponse.json({
          season: null,
          message: 'لا يوجد موسم نشط حالياً'
        });
      }

      return NextResponse.json({ season });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching season:', error);
      return NextResponse.json(
        { error: 'Failed to fetch season', details: errorMessage },
        { status: 500 }
      );
    }
  });
}

