import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, notFoundResponse } from '@/lib/api-utils';
import { getOrSetEducationalContent } from "@/lib/educational-cache-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const { topicId } = await params;

        const subTopics = await getOrSetEducationalContent(
          `topic:${topicId}:subtopics`,
          async () => {
            const topic = await prisma.topic.findUnique({
              where: { id: topicId },
              include: {
                subTopics: {
                  orderBy: { order: 'asc' }
                }
              }
            });

            if (!topic) return null;
            return topic.subTopics;
          },
          3600 // 1 hour cache
        );

        if (!subTopics) {
          return notFoundResponse("الموضوع غير موجود");
        }

        // Get student progress for these subtopics
        const progress = await prisma.topicProgress.findMany({
          where: {
            userId: authUser.userId,
            subTopicId: {
              in: subTopics.map((st: any) => st.id)
            }
          }
        });

        const subTopicsWithProgress = subTopics.map((st: any) => {
                                          const pg = progress.find((p: any) => p.subTopicId === st.id);
          return {
            ...st,
            isCompleted: pg ? pg.completed : false,
            completedAt: pg ? pg.completedAt : null
          };
        });

        return successResponse(subTopicsWithProgress);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
