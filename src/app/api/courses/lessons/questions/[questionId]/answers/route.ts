import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId, userRole }) => {
      try {
        const { questionId } = await params;
        const { content } = (await req.json()) as { content: string };

        if (!content || content.trim().length === 0) {
          return badRequestResponse("محتوى الرد مطلوب");
        }

        const isTeacher = userRole === "TEACHER" || userRole === "ADMIN";

        const answer = await prisma.lessonAnswer.create({
          data: {
            userId,
            questionId,
            content,
            isTeacher,
          },
          include: {
            user: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
        });

        return successResponse(answer);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
