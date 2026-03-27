import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const batchSchema = z.object({
  ids: z.array(z.string()).min(1, "يجب تحديد دورة واحدة على الأقل"),
  action: z.enum(["publish", "unpublish", "activate", "deactivate", "delete"]),
});

function ensureAdmin(userRole: string) {
  return userRole === "ADMIN";
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بإجراء عمليات جماعية على الدورات");
      }

      try {
        const body = await req.json();
        const validation = batchSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0]?.message || "بيانات غير صالحة");
        }

        const { ids, action } = validation.data;
        let affectedCount = 0;

        switch (action) {
          case "publish":
            const publishResult = await prisma.subject.updateMany({
              where: { id: { in: ids } },
              data: { isPublished: true },
            });
            affectedCount = publishResult.count;
            break;

          case "unpublish":
            const unpublishResult = await prisma.subject.updateMany({
              where: { id: { in: ids } },
              data: { isPublished: false },
            });
            affectedCount = unpublishResult.count;
            break;

          case "activate":
            const activateResult = await prisma.subject.updateMany({
              where: { id: { in: ids } },
              data: { isActive: true },
            });
            affectedCount = activateResult.count;
            break;

          case "deactivate":
            const deactivateResult = await prisma.subject.updateMany({
              where: { id: { in: ids } },
              data: { isActive: false },
            });
            affectedCount = deactivateResult.count;
            break;

          case "delete":
            // Check for enrollments before deleting
            const enrolledCourses = await prisma.subjectEnrollment.groupBy({
              by: ["subjectId"],
              where: { subjectId: { in: ids } },
              _count: true,
            });

            const enrolledIds = enrolledCourses.map((e) => e.subjectId);
            const deletableIds = ids.filter((id) => !enrolledIds.includes(id));

            if (deletableIds.length === 0) {
              return badRequestResponse(
                "جميع الدورات المحددة مرتبطة بطلاب ولا يمكن حذفها. يرجى إلغاء تفعيلها بدلاً من الحذف."
              );
            }

            const deleteResult = await prisma.subject.deleteMany({
              where: { id: { in: deletableIds } },
            });
            affectedCount = deleteResult.count;

            if (enrolledIds.length > 0) {
              return successResponse(
                { affectedCount, skippedCount: enrolledIds.length },
                `تم حذف ${affectedCount} دورة. تم تخطي ${enrolledIds.length} دورة لوجود طلاب مرتبطين.`
              );
            }
            break;
        }

        const actionLabels: Record<string, string> = {
          publish: "نشر",
          unpublish: "إلغاء نشر",
          activate: "تفعيل",
          deactivate: "إيقاف",
          delete: "حذف",
        };

        return successResponse(
          { affectedCount },
          `تم ${actionLabels[action]} ${affectedCount} دورة بنجاح`
        );
      } catch (error) {
        logger.error("Error in batch course operation", error);
        return handleApiError(error);
      }
    })
  );
}
