import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { TaskStatus, SUBJECT_ID_MAP } from '@/lib/constants';
import { successResponse, badRequestResponse, withAuth, handleApiError } from '@/lib/api-utils';

type CreateTaskBody = {
  title?: string;
  description?: string;
  subject?: string;
  subjectId?: string;
  dueAt?: string | null;
  priority?: number;
  status?: TaskStatus;
};

function normalizeSubjectId(body: CreateTaskBody): string | null {
  if (typeof body.subject === 'string' && body.subject.trim()) {
    return SUBJECT_ID_MAP[body.subject] || body.subject;
  }

  if (typeof body.subjectId === 'string' && body.subjectId.trim()) {
    return body.subjectId;
  }

  return null;
}

function normalizeDueAt(value: string | null | undefined): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePriority(priority: number | undefined): number {
  if (typeof priority !== 'number' || Number.isNaN(priority)) {
    return 0;
  }

  return Math.max(0, Math.min(2, Math.trunc(priority)));
}

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    // Try to get userId from query params first (for guest users)
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');

    if (queryUserId && queryUserId !== 'undefined' && queryUserId.trim() !== '') {
      try {
        const tasks = await prisma.task.findMany({
          where: {
            userId: queryUserId,
          },
          orderBy: [
            { createdAt: 'desc' },
            { dueAt: 'asc' },
          ],
        });

        return successResponse(tasks);
      } catch (error) {
        return handleApiError(error);
      }
    }

    // Fallback to standard authentication
    return withAuth(req, async (authUser) => {
      try {
        const tasks = await prisma.task.findMany({
          where: {
            userId: authUser.userId,
          },
          orderBy: [
            { createdAt: 'desc' },
            { dueAt: 'asc' },
          ],
        });

        return successResponse(tasks);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const body = (await req.json()) as CreateTaskBody;
        const title = typeof body.title === 'string' ? body.title.trim() : '';

        if (!title) {
          return badRequestResponse('Title is required');
        }

        const dueAt = normalizeDueAt(body.dueAt);
        if (body.dueAt && !dueAt) {
          return badRequestResponse('Invalid due date');
        }

        const task = await prisma.task.create({
          data: {
            userId: authUser.userId,
            title,
            description: typeof body.description === 'string' && body.description.trim()
              ? body.description.trim()
              : null,
            subjectId: normalizeSubjectId(body),
            dueAt,
            priority: normalizePriority(body.priority),
            status: body.status && Object.values(TaskStatus).includes(body.status)
              ? (body.status as any)
              : (TaskStatus.PENDING as any),
          } as any,
        });

        return successResponse(task, 'Task created', 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
