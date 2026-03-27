import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from "@/lib/logger";

function ensureAdmin(userRole: string) {
  return userRole === "ADMIN";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إدارة الدورات");
      }

      try {
        const { id } = await params;

        const course = await prisma.subject.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                topics: true,
                enrollments: true,
                reviews: true,
                teachers: true,
              },
            },
          },
        });

        if (!course) {
          return notFoundResponse("الدورة غير موجودة");
        }

        return successResponse({ course });
      } catch (error) {
        logger.error("Error fetching admin course details", error);
        return handleApiError(error);
      }
    })
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بحذف الدورات");
      }

      try {
        const { id } = await params;
        if (!id) {
          return badRequestResponse("معرف الدورة مطلوب");
        }

        const enrollmentsCount = await prisma.subjectEnrollment.count({
          where: { subjectId: id },
        });

        if (enrollmentsCount > 0) {
          return badRequestResponse(
            `لا يمكن حذف هذه الدورة لوجود ${enrollmentsCount} طالب مشترك بها. يرجى إلغاء تفعيل الدورة بدلاً من حذفها.`
          );
        }

        await prisma.subject.delete({
          where: { id },
        });

        return successResponse({ success: true }, "تم حذف الدورة بنجاح");
      } catch (error) {
        logger.error("Error deleting admin course by id", error);
        return handleApiError(error);
      }
    })
  );
}
