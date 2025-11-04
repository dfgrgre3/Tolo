import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/lib/gamification-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const { goalId } = params;
    const body = await request.json();
    const { currentValue } = body;

    if (currentValue === undefined) {
      return NextResponse.json({ error: 'currentValue is required' }, { status: 400 });
    }

    const updatedGoal = await gamificationService.updateCustomGoal(goalId, currentValue);
    return NextResponse.json(updatedGoal);

  } catch (error: any) {
    console.error('Error updating custom goal:', error);
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update custom goal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const { goalId } = params;
    await gamificationService.deleteCustomGoal(goalId);
    return NextResponse.json({ message: 'Goal deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting custom goal:', error);
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete custom goal' },
      { status: 500 }
    );
  }
}

