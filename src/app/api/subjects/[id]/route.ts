import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { authService } from "@/lib/services/auth-service";
import { invalidateUserCache } from "@/lib/cache-invalidation-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return opsWrapper(req, async (request) => {
        try {
            // Verify authentication via middleware headers
            const userId = request.headers.get("x-user-id");
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const { id: subjectId } = await params;

            if (!subjectId) {
                return NextResponse.json({ error: "Subject ID required" }, { status: 400 });
            }

            // Find and delete enrollment
            const enrollment = await prisma.subjectEnrollment.findFirst({
                where: {
                    userId,
                    subjectId: subjectId
                }
            });

            if (!enrollment) {
                return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
            }

            await prisma.subjectEnrollment.delete({
                where: {
                    id: enrollment.id
                }
            });

            // Invalidate user's subject cache
            await invalidateUserCache(userId);

            return NextResponse.json({ message: "Unenrolled successfully" });
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Server error";
            return NextResponse.json({ error: errorMessage }, { status: 500 });
        }
    });
}
