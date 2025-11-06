import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/advanced-gamification-service';

// POST /api/gamification/quests/[questId]/progress - Update quest progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  try {
    const { questId } = await params;
    const body = await request.json();
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

    await advancedGamificationService.updateQuestProgress(
      userId,
      questId,
      progress
    );

    return NextResponse.json({ 
      success: true,
      message: 'تم تحديث تقدم المهمة بنجاح' 
    });
  } catch (error: any) {
    console.error('Error updating quest progress:', error);
    return NextResponse.json(
      { error: 'Failed to update quest progress', details: error.message },
      { status: 500 }
    );
  }
}

