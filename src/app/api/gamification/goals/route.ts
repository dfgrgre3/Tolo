import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/gamification-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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
    console.error('Error fetching custom goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, goalData, goalId, updateData } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'create_goal':
        if (!goalData) {
          return NextResponse.json({ error: 'Goal data is required' }, { status: 400 });
        }

        result = await gamificationService.createCustomGoal(userId, goalData);
        break;

      case 'update_goal':
        if (!goalId || updateData === undefined) {
          return NextResponse.json({ error: 'Goal ID and update data are required' }, { status: 400 });
        }

        result = await gamificationService.updateCustomGoal(goalId, updateData);
        break;

      case 'delete_goal':
        if (!goalId) {
          return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
        }

        // Delete the goal from database
        await gamificationService.deleteCustomGoal(goalId);
        result = { message: 'Goal deleted successfully' };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in custom goals API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
