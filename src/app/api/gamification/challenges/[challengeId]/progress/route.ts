import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/advanced-gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// POST /api/gamification/challenges/[challengeId]/progress - Update challenge progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { challengeId } = await params;
      const body = await req.json();
    const { userId, progress } = body;

    if (!userId || progress === undefined) {
      return NextResponse.json(
        { error: 'User ID and progress are required' },
        { status: 400 }
      );
    }

    if (progress < 0 || progress > 100) {
      return NextResponse.json(
        { error: 'Progress must be between 0 and 100' },
        { status: 400 }
      );
    }

    await advancedGamificationService.updateChallengeProgress(
      userId,
      challengeId,
      progress
    );

    return NextResponse.json({ 
      success: true,
      message: 'تم تحديث التقدم بنجاح' 
    });
  } catch (error: any) {
    logger.error('Error updating challenge progress:', error);
    return NextResponse.json(
      { error: 'Failed to update challenge progress', details: error.message },
      { status: 500 }
    );
    }
  });
}

