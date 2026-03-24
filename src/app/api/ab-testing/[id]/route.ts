import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, withAuth, notFoundResponse } from '@/lib/api-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async () => {
      try {
        const { id } = await params;
        const data = await req.json();
        
        const existing = await prisma.experiment.findUnique({
          where: { id }
        });

        if (!existing) return notFoundResponse("Experiment not found");

        const updates: any = {};
        if (data.status) {
          updates.status = data.status;
          if (data.status === 'completed') {
            updates.endDate = new Date();
          }
        }
        
        // Handle winner if needed (though not in schema yet, could be added or ignored)
        // For now let's just update common fields
        if (data.title) updates.title = data.title;
        if (data.description) updates.description = data.description;

        const updated = await prisma.experiment.update({
          where: { id },
          data: updates
        });

        return successResponse(updated);
      } catch (error: any) {
        return handleApiError(error);
      }
    });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async () => {
      try {
        const { id } = await params;
        await prisma.experiment.delete({ where: { id } });
        return successResponse({ ok: true });
      } catch (error: any) {
        return handleApiError(error);
      }
    });
  });
}
