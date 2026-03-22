import { NextRequest } from 'next/server';
import { prisma } from "@/lib/db";
import { gamificationService } from "@/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { TaskStatus, SUBJECT_ID_MAP } from '@/lib/constants';
import { successResponse, badRequestResponse, notFoundResponse, withAuth, handleApiError } from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;

        const task = await prisma.task.findFirst({
          where: {
            id,
            userId: authUser.userId // Ensure user can only access their own tasks
          }
        });

        if (!task) return notFoundResponse('Task not found');
        return successResponse(task);
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;
        const data = await request.json();

        // Validate that the task belongs to the authenticated user
        const existingTask = await prisma.task.findFirst({
          where: {
            id,
            userId: authUser.userId
          }
        });

        if (!existingTask) {
          return notFoundResponse('Task not found');
        }

        // Whitelist allowed fields to prevent mass assignment vulnerability
        const allowedFields = ['title', 'description', 'completedAt', 'status', 'priority', 'dueAt', 'subjectId'];
        const updates: Record<string, unknown> = {};

        for (const field of allowedFields) {
          if (field in data) {
            if (field === 'dueAt' && typeof data[field] === 'string') {
              updates[field] = new Date(data[field]);
            } else if (field === 'completedAt' && data[field] === true) {
              updates[field] = new Date();
            } else if (field === 'completedAt' && data[field] === false) {
              updates[field] = null;
            } else if (field === 'priority' && typeof data[field] === 'number') {
              updates[field] = data[field] + 1;
            } else if (field === 'description' && data[field] === '') {
              updates[field] = null;
            } else {
              updates[field] = data[field];
            }
          }
        }

        if ('subject' in data) updates.subjectId = data.subject ? SUBJECT_ID_MAP[data.subject] || data.subject : null;

        // Prevent changing userId through mass assignment
        if ('userId' in data) {
          return badRequestResponse('Cannot change task ownership');
        }

        // Check if task is being marked as completed
        const isCompleting = (updates['status'] === TaskStatus.COMPLETED && existingTask.status !== TaskStatus.COMPLETED) ||
          (updates['completedAt'] !== undefined && !existingTask.completedAt);

        const updated = await prisma.task.update({
          where: { id },
          data: updates as any,
        });

        // Trigger gamification if task is being completed
        if (isCompleting) {
          try {
            await gamificationService.updateUserProgress(authUser.userId, 'task_completed', {});
          } catch (gamificationError) {
            logger.error('Error updating gamification for task:', gamificationError);
            // Don't fail the request if gamification fails
          }
        }

        return successResponse(updated);
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;

        // Validate that the task belongs to the authenticated user before deletion
        const existingTask = await prisma.task.findFirst({
          where: {
            id,
            userId: authUser.userId
          }
        });

        if (!existingTask) {
          return notFoundResponse('Task not found');
        }

        await prisma.task.delete({ where: { id } });
        return successResponse({ ok: true });
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}

export const PUT = PATCH;
