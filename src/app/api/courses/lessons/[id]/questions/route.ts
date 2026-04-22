import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from "@/lib/api-utils";

export async function GET(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    try {
      const { id: lessonId } = await params;

      const questions = await prisma.lessonQuestion.findMany({
        where: { subTopicId: lessonId },
        include: {
          user: {
            select: {
              name: true,
              avatar: true
            }
          },
          answers: {
            include: {
              user: {
                select: {
                  name: true,
                  avatar: true
                }
              }
            },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      return successResponse(questions);
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function POST(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (_req) => {
    return withAuth(request, async ({ userId }) => {
      try {
        const { id: lessonId } = await params;
        const { content } = (await request.json()) as {content: string;};

        if (!content || content.trim().length === 0) {
          return badRequestResponse("محتوى السؤال مطلوب");
        }

        const question = await prisma.lessonQuestion.create({
          data: {
            userId,
            subTopicId: lessonId,
            content
          },
          include: {
            user: {
              select: {
                name: true,
                avatar: true
              }
            }
          }
        });

        return successResponse(question);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
