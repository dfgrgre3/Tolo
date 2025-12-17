import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/services/advanced-gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// POST /api/gamification/seasons/[seasonId]/join - Join a season
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { seasonId } = await params;
      const body = await req.json();
      const { userId } = body;

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      await advancedGamificationService.joinSeason(userId, seasonId);

      return NextResponse.json({
        success: true,
        message: 'تم الانضمام للموسم بنجاح'
      });
    } catch (error: unknown) {
      logger.error('Error joining season:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: 'Failed to join season', details: errorMessage },
        { status: 500 }
      );
    }
  });
}

