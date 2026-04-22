import { NextRequest } from 'next/server';
import { prisma, Prisma } from "@/lib/db";
import { gamificationService } from "@/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { TaskStatus, SUBJECT_ID_MAP } from '@/lib/constants';
import { successResponse, badRequestResponse, notFoundResponse, withAuth, handleApiError } from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: {params: Promise<{id: string;}>;}) {
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

export async function PATCH(req: NextRequest, { params }: {params: Promise<{id: string;}>;}) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;
        const data = await request.json();

        // 1. Pre-validation and whitelist (Compute only)
        const _allowedFields = ['title', 'description', 'completedAt', 'status', 'priority', 'dueAt', 'subjectId'];
        const updates: Prisma.TaskUpdateInput = {};

        if ('title' in data) updates.title = data.title;
        if ('description' in data) updates.description = data.description === '' ? null : data.description;
        if ('status' in data) updates.status = data.status;
        if ('priority' in data) updates.priority = data.priority;

        if ('dueAt' in data) {
          updates.dueAt = data.dueAt ? new Date(data.dueAt) : null;
        }

        if ('completedAt' in data) {
          if (data.completedAt === true) {
            updates.completedAt = new Date();
          } else if (data.completedAt === false) {
            updates.completedAt = null;
          } else if (data.completedAt instanceof Date || typeof data.completedAt === 'string') {
            updates.completedAt = new Date(data.completedAt);
          }
        }

        if ('subjectId' in data) {
          updates.subject = data.subjectId ? { connect: { id: data.subjectId } } : { disconnect: true };
        } else if ('subject' in data) {
          const subjectId = data.subject ? SUBJECT_ID_MAP[data.subject] || data.subject : null;
          updates.subject = subjectId ? { connect: { id: subjectId } } : { disconnect: true };
        }

        if ('userId' in data) {
          return badRequestResponse('Cannot change task ownership');
        }

        // 2. Combined Ownership Check and Fetch
        const existingTask = await prisma.task.findFirst({
          where: { id, userId: authUser.userId },
          select: { status: true, completedAt: true }
        });

        if (!existingTask) {
          return notFoundResponse('Task not found or unauthorized');
        }

        // 3. Perform update (O(1) by primary key)
        const updatedTask = await prisma.task.update({
          where: { id },
          data: updates
        });

        // 4. Post-update logic (Gamification)
        const isCompleting = data.status === TaskStatus.COMPLETED && existingTask.status !== TaskStatus.COMPLETED ||
        updates.completedAt !== undefined && updates.completedAt !== null && !existingTask.completedAt;

        if (isCompleting) {
          try {
            await gamificationService.updateUserProgress(authUser.userId, 'task_completed', {});
          } catch (gamificationError) {
            logger.error('Error updating gamification for task:', gamificationError);
          }
        }

        return successResponse(updatedTask);
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}

export async function DELETE(req: NextRequest, { params }: {params: Promise<{id: string;}>;}) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;

        // Optimized Delete: Single-query atomic deletion with ownership check
        const { count } = await prisma.task.deleteMany({
          where: {
            id,
            userId: authUser.userId
          }
        });

        if (count === 0) {
          return notFoundResponse('Task not found or unauthorized');
        }

        return successResponse({ ok: true });
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}

export const PUT = PATCH;