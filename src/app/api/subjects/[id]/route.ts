import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { invalidateUserCache } from "@/lib/cache-invalidation-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, unauthorizedResponse, badRequestResponse, notFoundResponse, handleApiError } from "@/lib/api-utils";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return opsWrapper(req, async (request) => {
        try {
            // Verify authentication via middleware headers
            const userId = request.headers.get("x-user-id");
            if (!userId) {
                return unauthorizedResponse();
            }
            const { id: subjectId } = await params;

            if (!subjectId) {
                return badRequestResponse("Subject ID required");
            }

            // Find and delete enrollment
            const enrollment = await prisma.subjectEnrollment.findFirst({
                where: {
                    userId,
                    subjectId: subjectId
                }
            });

            if (!enrollment) {
                return notFoundResponse("Enrollment not found");
            }

            await prisma.subjectEnrollment.delete({
                where: {
                    id: enrollment.id
                }
            });

            // Invalidate user's subject cache
            await invalidateUserCache(userId);

            return successResponse({ message: "Unenrolled successfully" });
        } catch (e: unknown) {
            return handleApiError(e);
        }
    });
}
