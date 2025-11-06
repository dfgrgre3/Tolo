import { NextRequest, NextResponse } from 'next/server';
import { advancedGamificationService } from '@/lib/advanced-gamification-service';

// GET /api/gamification/seasons - Get active season
export async function GET(request: NextRequest) {
  try {
    const season = await advancedGamificationService.getActiveSeason();
    
    if (!season) {
      return NextResponse.json({ 
        season: null,
        message: 'لا يوجد موسم نشط حالياً' 
      });
    }

    return NextResponse.json({ season });
  } catch (error: any) {
    console.error('Error fetching season:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season', details: error.message },
      { status: 500 }
    );
  }
}

