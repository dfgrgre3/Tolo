import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, notFoundResponse } from '@/lib/api-utils';
import { getOrSetEducationalContent } from "@/lib/educational-cache-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async () => {
      try {
        const { subjectId } = await params;

        const topics = await getOrSetEducationalContent(
          `subject:${subjectId}:topics`,
          async () => {
            const subject = await prisma.subject.findUnique({
              where: { id: subjectId },
              include: {
                topics: {
                  orderBy: { order: 'asc' },
                  include: {
                    _count: {
                      select: { subTopics: true }
                    }
                  }
                }
              }
            });

            if (!subject) return null;
            return subject.topics;
          },
          3600 // 1 hour cache
        );

        if (!topics) {
          return notFoundResponse("المادة غير موجودة");
        }

        return successResponse(topics);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
