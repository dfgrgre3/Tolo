import { NextRequest, NextResponse } from 'next/server';
import { gamificationService } from '@/services/gamification-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function PATCH(
request: NextRequest,
{ params }: {params: Promise<{goalId: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    try {
      const { goalId } = await params;
      const body = await request.json();
      const { currentValue } = body;

      if (currentValue === undefined) {
        return NextResponse.json({ error: 'currentValue is required' }, { status: 400 });
      }

      const updatedGoal = await gamificationService.updateCustomGoal(goalId, currentValue);
      return NextResponse.json(updatedGoal);

    } catch (error: unknown) {
      logger.error('Error updating custom goal:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('not found')) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to update custom goal' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
request: NextRequest,
{ params }: {params: Promise<{goalId: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    try {
      const { goalId } = await params;
      await gamificationService.deleteCustomGoal(goalId);
      return NextResponse.json({ message: 'Goal deleted successfully' });

    } catch (error: unknown) {
      logger.error('Error deleting custom goal:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('not found')) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to delete custom goal' },
        { status: 500 }
      );
    }
  });
}
