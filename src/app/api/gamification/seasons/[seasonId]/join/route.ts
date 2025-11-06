import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/advanced-gamification-service';

// POST /api/gamification/seasons/[seasonId]/join - Join a season
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params;
    const body = await request.json();
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
  } catch (error: any) {
    console.error('Error joining season:', error);
    return NextResponse.json(
      { error: 'Failed to join season', details: error.message },
      { status: 500 }
    );
  }
}

