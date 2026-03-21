import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { invalidateUserCache } from "@/lib/cache-invalidation-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  successResponse,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  handleApiError,
} from "@/lib/api-utils";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  return opsWrapper(req, async (request) => {
    try {
      const userId = request.headers.get("x-user-id");
      if (!userId) {
        return unauthorizedResponse();
      }

      const { subjectId } = await params;

      if (!subjectId) {
        return badRequestResponse("Subject ID required");
      }

      const enrollment = await prisma.subjectEnrollment.findFirst({
        where: {
          userId,
          subjectId,
        },
      });

      if (!enrollment) {
        return notFoundResponse("Enrollment not found");
      }

      await prisma.subjectEnrollment.delete({
        where: {
          id: enrollment.id,
        },
      });

      await invalidateUserCache(userId);

      return successResponse({ message: "Unenrolled successfully" });
    } catch (e: unknown) {
      return handleApiError(e);
    }
  });
}
