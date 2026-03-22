import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, handleApiError } from "@/lib/api-utils";
import { getCourseCurriculum } from "@/lib/courses/advanced-course-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const searchParams = new URL(req.url).searchParams;
      const userId = searchParams.get("userId") || req.headers.get("x-user-id");

      const curriculum = (await getCourseCurriculum(id, userId || undefined)) as any[];

      return successResponse({
        curriculum,
        subjectId: id,
        totalChapters: curriculum.length,
        totalLessons: curriculum.reduce((acc: number, c: any) => acc + (c.subTopics?.length || 0), 0),
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
