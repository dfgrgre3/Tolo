import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, notFoundResponse, forbiddenResponse } from '@/lib/api-utils';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const { id } = await params;

        const result = await prisma.examResult.findUnique({
          where: { id }
        });

        if (!result) {
          return notFoundResponse("نتيجة الامتحان غير موجودة");
        }

        if (result.userId !== authUser.userId && authUser.userRole !== "ADMIN") {
          return forbiddenResponse("غير مسموح لك بحذف هذه النتيجة");
        }

        await prisma.examResult.delete({
          where: { id }
        });

        return successResponse({ success: true }, "تم حذف النتيجة بنجاح");
      } catch (e: any) {
        return handleApiError(e);
      }
    });
  });
}