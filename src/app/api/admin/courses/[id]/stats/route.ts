import { NextRequest } from "next/server";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { getCourseStats } from "@/lib/courses/advanced-course-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى إحصائيات الدورة");
      }

      try {
        const { id } = await params;
        const stats = await getCourseStats(id);

        if (!stats) {
          return notFoundResponse("الدورة غير موجودة");
        }

        return successResponse({ stats });
      } catch (error) {
        logger.error("Error fetching course stats:", error);
        return handleApiError(error);
      }
    })
  );
}
