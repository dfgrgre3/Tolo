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

        // If marking as completed, update enrollment progress and award XP
        if (completed) {
          // Award XP (10 XP per lesson)
          await prisma.user.update({
            where: { id: userId },
            data: { totalXP: { increment: 10 } }
          });

          // Get the subject (course) for this lesson
          const subTopic = await prisma.subTopic.findUnique({
            where: { id },
            include: { topic: { include: { subject: true } } }
          });

          if (subTopic?.topic?.subject) {
            const subjectId = subTopic.topic.subject.id;

            // Recalculate progress
            const allSubTopics = await prisma.subTopic.findMany({
              where: { topic: { subjectId } },
              select: { id: true }
            });
            
            const subTopicIds = allSubTopics.map((st: any) => st.id);
            const userProgress = await prisma.topicProgress.findMany({
              where: { userId, subTopicId: { in: subTopicIds }, completed: true }
            });

            const progressPercentage = Math.round((userProgress.length / subTopicIds.length) * 100);

            // Update Subject Enrollment progress
            await prisma.subjectEnrollment.update({
              where: { userId_subjectId: { userId, subjectId } },
              data: { progress: progressPercentage }
            });

            // Generate Certificate if 100%
            if (progressPercentage === 100) {
               await prisma.subjectCertificate.upsert({
                 where: { subjectId_userId: { subjectId, userId } },
                 update: {},
                 create: {
                   subjectId,
                   userId,
                   certUrl: `/certificates/${userId}_${subjectId}.pdf` 
                 }
               });
            }
          }
        }

        return successResponse(progressRecord);
      } catch (error) {
        logger.error("Error updating lesson progress:", error instanceof Error ? error.message : String(error));
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
