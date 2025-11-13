import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const status = searchParams.get('status'); // 'active', 'completed', 'all'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user progress with custom goals
    const progress = await gamificationService.getUserProgress(userId);

    let filteredGoals = progress.customGoals;

    // Filter by category if provided
    if (category && category !== 'all') {
      filteredGoals = filteredGoals.filter(goal => goal.category === category);
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      if (status === 'active') {
        filteredGoals = filteredGoals.filter(goal => !goal.isCompleted);
      } else if (status === 'completed') {
        filteredGoals = filteredGoals.filter(goal => goal.isCompleted);
      }
    }

    return NextResponse.json({
      goals: filteredGoals,
      summary: {
        total: progress.customGoals.length,
        active: progress.customGoals.filter(g => !g.isCompleted).length,
        completed: progress.customGoals.filter(g => g.isCompleted).length
      }
    });

  } catch (error) {
    logger.error('Error fetching custom goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom goals' },
      { status: 500 }
    );
    }
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
    const { userId, title, description, targetValue, currentValue = 0, unit, category } = body;

    if (!userId || !title || targetValue === undefined) {
      return NextResponse.json({ error: 'User ID, title, and targetValue are required' }, { status: 400 });
    }

    const goalData = {
      title,
      description,
      targetValue,
      currentValue,
      unit: unit || 'count',
      category: category || 'custom'
    };

    const result = await gamificationService.createCustomGoal(userId, goalData);
    return NextResponse.json(result);

  } catch (error) {
    logger.error('Error in custom goals API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    }
  });
}
