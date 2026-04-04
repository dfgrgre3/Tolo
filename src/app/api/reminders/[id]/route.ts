import { NextRequest } from "next/server";
import { prisma, Prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, notFoundResponse, withAuth, handleApiError, badRequestResponse } from '@/lib/api-utils';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { id } = await params;
        const body = (await request.json()) as { 
          title?: string; 
          description?: string; 
          scheduledAt?: string; 
          completed?: boolean; 
          priority?: number;
          userId?: string;
        };

        // Prevent changing userId through mass assignment
        if ('userId' in body) {
          return badRequestResponse('Cannot change reminder ownership');
        }

        const updates: Prisma.ReminderUpdateInput = {};
        if ('title' in body) updates.title = body.title;
        if ('description' in body) updates.description = body.description;
        if ('completed' in body) updates.completed = body.completed;
        if ('priority' in body) updates.priority = body.priority;
        if (body.scheduledAt) updates.scheduledAt = new Date(body.scheduledAt);

        // 2. Optimized Update: Single DB roundtrip for ownership check + update
        // We use updateMany then findUnique to handle "not found or unauthorized" efficiently
        const { count } = await prisma.reminder.updateMany({
          where: { 
            id, 
            userId: authUser.userId 
          },
          data: updates
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
