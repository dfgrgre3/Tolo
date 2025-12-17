import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/db";
import { authService } from "@/lib/services/auth-service";
import { gamificationService } from "@/lib/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { TASK_STATUS } from '@/lib/constants';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    try {
      const { id } = await params;
      // Authenticate user
      const verification = await authService.verifyTokenFromRequest(request, { checkSession: true });
      if (!verification.isValid || !verification.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const authUser = verification.user;

      const task = await prisma.task.findFirst({
        where: {
          id,
          userId: authUser.id // Ensure user can only access their own tasks
        }
      });

      if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      return NextResponse.json(task);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Server error';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    try {
      const { id } = await params;
      // Authenticate user
      const verification = await authService.verifyTokenFromRequest(request, { checkSession: true });
      if (!verification.isValid || !verification.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const authUser = verification.user;

      const data = await request.json();

      // Validate that the task belongs to the authenticated user
      const existingTask = await prisma.task.findFirst({
        where: {
          id,
          userId: authUser.id
        }
      });

      if (!existingTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      // Whitelist allowed fields to prevent mass assignment vulnerability
      const allowedFields = ['title', 'description', 'completedAt', 'status', 'priority', 'dueAt', 'subject'];
      const updates: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (field in data) {
          if (field === 'dueAt' && typeof data[field] === 'string') {
            updates[field] = new Date(data[field]);
          } else if (field === 'completedAt' && data[field] === true) {
            updates[field] = new Date();
          } else if (field === 'completedAt' && data[field] === false) {
            updates[field] = null;
          } else if (field === 'subject' && data[field] === '') {
            updates[field] = null;
          } else if (field === 'description' && data[field] === '') {
            updates[field] = null;
          } else {
            updates[field] = data[field];
          }
        }
      }

      // Prevent changing userId through mass assignment
      if ('userId' in data) {
        return NextResponse.json({ error: 'Cannot change task ownership' }, { status: 400 });
      }

      // Check if task is being marked as completed
      const isCompleting = (updates['status'] === TASK_STATUS.COMPLETED && existingTask.status !== TASK_STATUS.COMPLETED) ||
        (updates['completedAt'] !== undefined && !existingTask.completedAt);

      const updated = await prisma.task.update({
        where: { id },
        data: updates as any,
      });

      // Trigger gamification if task is being completed
      if (isCompleting) {
        try {
          await gamificationService.updateUserProgress(authUser.id, 'task_completed');
        } catch (gamificationError) {
          logger.error('Error updating gamification for task:', gamificationError);
          // Don't fail the request if gamification fails
        }
      }

      return NextResponse.json(updated);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Server error';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    try {
      const { id } = await params;
      // Authenticate user
      const verification = await authService.verifyTokenFromRequest(request, { checkSession: true });
      if (!verification.isValid || !verification.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const authUser = verification.user;

      // Validate that the task belongs to the authenticated user before deletion
      const existingTask = await prisma.task.findFirst({
        where: {
          id,
          userId: authUser.id
        }
      });

      if (!existingTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      await prisma.task.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Server error';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}
