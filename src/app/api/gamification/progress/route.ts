import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/gamification-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const progress = await gamificationService.getUserProgress(userId);
    return NextResponse.json(progress);

  } catch (error) {
    console.error('Error fetching user progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user progress' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, data } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    const updatedProgress = await gamificationService.updateUserProgress(userId, action, data || {});
    return NextResponse.json(updatedProgress);

  } catch (error) {
    console.error('Error updating user progress:', error);
    return NextResponse.json(
      { error: 'Failed to update user progress' },
      { status: 500 }
    );
  }
}

