import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id: lessonId } = await params;

        const note = await prisma.lessonNote.findUnique({
          where: {
            userId_subTopicId: {
              userId,
              subTopicId: lessonId,
            },
          },
        });

        return successResponse(note || { content: "" });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id: lessonId } = await params;
        const { content } = (await req.json()) as { content: string };

        if (content === undefined) {
          return badRequestResponse("المحتوى مطلوب");
        }

        const note = await prisma.lessonNote.upsert({
          where: {
            userId_subTopicId: {
              userId,
              subTopicId: lessonId,
            },
          },
          update: { content },
          create: {
            userId,
            subTopicId: lessonId,
            content,
          },
        });

        return successResponse(note);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
