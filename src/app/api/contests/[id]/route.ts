import { NextRequest } from 'next/server';
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { successResponse, notFoundResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async () => {
    try {
      const { id } = await params;

      const contest = await prisma.contest.findUnique({
        where: { id },
        include: {
          organizer: {
            select: { name: true, avatar: true }
          },
          questions: true,
          _count: {
            select: { questions: true }
          }
        }
      });

      if (!contest) return notFoundResponse('Contest not found');
      return successResponse(contest);
    } catch (e: unknown) {
      return handleApiError(e);
    }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;
        const data = await request.json();

        // Check ownership or admin status (using authUser role if needed)
        const existingContest = await prisma.contest.findUnique({
          where: { id }
        });

        if (!existingContest) {
          return notFoundResponse('Contest not found');
        }

        // Only organizer or admin can modify
        if (existingContest.organizerId !== authUser.userId && !['ADMIN', 'TEACHER'].includes(authUser.role)) {
          return badRequestResponse('Unauthorized to modify this contest');
        }

        const allowedFields = ['title', 'description', 'imageUrl', 'startDate', 'endDate', 'prizes', 'category', 'tags', 'status', 'pinCode', 'isActive'];
        const updates: Record<string, any> = {};

        for (const field of allowedFields) {
          if (field in data) {
            if (['startDate', 'endDate'].includes(field)) {
              updates[field] = new Date(data[field]);
            } else {
              updates[field] = data[field];
            }
          }
        }

        const updated = await prisma.contest.update({
          where: { id },
          data: updates,
          include: {
             organizer: { select: { name: true } }
          }
        });

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

        const existingContest = await prisma.contest.findUnique({
          where: { id }
        });

        if (!existingContest) {
          return notFoundResponse('Contest not found');
        }

        if (existingContest.organizerId !== authUser.userId && !['ADMIN', 'TEACHER'].includes(authUser.role)) {
          return badRequestResponse('Unauthorized to delete this contest');
        }

        await prisma.contest.delete({ where: { id } });
        return successResponse({ ok: true });
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}
