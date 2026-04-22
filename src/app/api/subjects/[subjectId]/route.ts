import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { invalidateUserCache } from "@/lib/cache-invalidation-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  successResponse,

  badRequestResponse,
  notFoundResponse,
  handleApiError,
  withAuth } from
"@/lib/api-utils";

export async function DELETE(
req: NextRequest,
{ params }: {params: Promise<{subjectId: string;}>;})
{
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { subjectId } = await params;

        if (!subjectId) {
          return badRequestResponse("Subject ID required");
        }

        // Optimized Delete: Atomic unenrollment with ownership check
        const { count } = await prisma.subjectEnrollment.deleteMany({
          where: {
            userId: authUser.userId,
            subjectId
          }
        });

        if (count === 0) {
          return notFoundResponse("Enrollment not found or unauthorized");
        }

        await invalidateUserCache(authUser.userId);

        return successResponse({ message: "Unenrolled successfully" });
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}