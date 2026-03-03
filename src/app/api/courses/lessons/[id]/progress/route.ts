import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// POST to update lesson progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params; // lesson ID
        const { completed, subject } = await req.json();

        if (completed === undefined || !subject) {
          return badRequestResponse("حالة الإكمال والمادة مطلوبة");
        }

        // Check if lesson exists
        const lesson = await prisma.subTopic.findUnique({
          where: { id }
        });

        if (!lesson) {
          return notFoundResponse("الدرس غير موجود");
        }

        // Update or create progress record
        const progressRecord = await prisma.topicProgress.upsert({
          where: {
            userId_subTopicId: {
              userId,
              subTopicId: id
            }
          },
          update: {
            completed
          },
          create: {
            userId,
            subTopicId: id,
            completed
          }
        });

        // If marking as completed, update enrollment progress
        if (completed) {
          // Get all lessons for this subject
          const subjectData = await prisma.subject.findFirst({
            where: { name: subject }
          });

          if (subjectData) {
            const subjectTopics = await prisma.topic.findMany({
              where: { subjectId: subjectData.id },
              include: { subTopics: true }
            });

            const allSubTopics = subjectTopics.flatMap((topic) => topic.subTopics);
            const subTopicIds = allSubTopics.map((st) => st.id);

            // Get user progress for all subtopics in this subject
            const userProgress = await prisma.topicProgress.findMany({
              where: {
                userId,
                subTopicId: { in: subTopicIds }
              }
            });

            const completedCount = userProgress.filter((p) => p.completed).length;
            const totalCount = subTopicIds.length;
            const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            // Update subject enrollment with progress - skipped as field doesn't exist
            // await prisma.subjectEnrollment.updateMany({ ... });
          }
        }

        return successResponse(progressRecord);
      } catch (error) {
        logger.error("Error updating lesson progress:", error);
        return handleApiError(error);
      }
    });
  });
}

// GET lesson progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params;

        const progress = await prisma.topicProgress.findUnique({
          where: {
            userId_subTopicId: {
              userId,
              subTopicId: id
            }
          }
        });

        return successResponse(progress || { completed: false });
      } catch (error) {
        logger.error("Error fetching lesson progress:", error);
        return handleApiError(error);
      }
    });
  });
}
