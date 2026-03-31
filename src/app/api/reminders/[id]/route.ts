import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, notFoundResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;
        const body = await request.json();

        // 1. Whitelist allowed fields to prevent mass assignment
        const allowedFields = ['title', 'description', 'scheduledAt', 'completed', 'priority'];
        const updates: Record<string, unknown> = {};

        for (const field of allowedFields) {
          if (field in body) {
            if (field === 'scheduledAt' && typeof body[field] === 'string') {
              updates[field] = new Date(body[field]);
            } else {
              updates[field] = body[field];
            }
          }
        }

        // Prevent changing userId through mass assignment
        if ('userId' in body) {
          return badRequestResponse('Cannot change reminder ownership');
        }

        // 2. Optimized Update: Single DB roundtrip for ownership check + update
        const { count } = await prisma.reminder.updateMany({
          where: { 
            id, 
            userId: authUser.userId 
          },
          data: updates as any
        });

        if (count === 0) {
          return notFoundResponse('Reminder not found or unauthorized');
        }

        const updated = await prisma.reminder.findUnique({ where: { id } });
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

        // Optimized Delete: Atomic deletion with ownership check
        const { count } = await prisma.reminder.deleteMany({
          where: { 
            id, 
            userId: authUser.userId 
          }
        });

        if (count === 0) {
          return notFoundResponse('Reminder not found or unauthorized');
        }

        return successResponse({ ok: true });
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}
