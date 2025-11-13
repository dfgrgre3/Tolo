import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth-unified";
import { gamificationService } from "@/lib/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    try {
      const { id } = await params;
      // Authenticate user
      const authUser = verifyToken(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findFirst({
      where: {
        id,
        userId: authUser.userId // Ensure user can only access their own tasks
      }
    });

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json(task);
  } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
    }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    try {
      const { id } = await params;
      // Authenticate user
      const authUser = verifyToken(request);
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const data = await request.json();

    // Validate that the task belongs to the authenticated user
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: authUser.userId
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Whitelist allowed fields to prevent mass assignment vulnerability
    const allowedFields = ['title', 'description', 'completed', 'status', 'priority', 'dueAt', 'subject', 'category'];
    const updates: any = {};

    for (const field of allowedFields) {
      if (field in data) {
        if (field === 'dueAt' && typeof data[field] === 'string') {
          updates[field] = new Date(data[field]);
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
    const isCompleting = (updates.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') ||
                         (updates.completed === true && !existingTask.completed);

    const updated = await prisma.task.update({
      where: { id },
      data: updates,
    });

    // Trigger gamification if task is being completed
    if (isCompleting) {
      try {
        await gamificationService.updateUserProgress(authUser.userId, 'task_completed');
      } catch (gamificationError) {
        logger.error('Error updating gamification for task:', gamificationError);
        // Don't fail the request if gamification fails
      }
    }

    return NextResponse.json(updated);
  } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    try {
      const { id } = await params;
      // Authenticate user
      const authUser = verifyToken(request);
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Validate that the task belongs to the authenticated user before deletion
      const existingTask = await prisma.task.findFirst({
        where: {
          id,
          userId: authUser.userId
        }
      });

      if (!existingTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      await prisma.task.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
    }
  });
}
