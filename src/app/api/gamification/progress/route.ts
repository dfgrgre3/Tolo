import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/services/gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const progress = await gamificationService.getUserProgress(userId);
    return NextResponse.json(progress);

  } catch (error) {
    logger.error('Error fetching user progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user progress' },
      { status: 500 }
    );
    }
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
    const { userId, action, data } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    const updatedProgress = await gamificationService.updateUserProgress(userId, action, data || {});
    return NextResponse.json(updatedProgress);

  } catch (error) {
    logger.error('Error updating user progress:', error);
    return NextResponse.json(
      { error: 'Failed to update user progress' },
      { status: 500 }
    );
    }
  });
}

