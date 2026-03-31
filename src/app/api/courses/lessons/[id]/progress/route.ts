import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, badRequestResponse, handleApiError, ApiError, withAuth } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { Prisma } from "@prisma/client";

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

        // Use transaction for consistency and to prevent race conditions
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Check if lesson exists
          const lesson = await tx.subTopic.findUnique({
            where: { id },
            include: { topic: { include: { subject: true } } }
          });

          if (!lesson) {
             throw new ApiError("الدرس غير موجود", 404);
          }

          const subjectId = lesson.topic.subject.id;

          // Check existing progress for idempotency
          const existingProgress = await tx.topicProgress.findUnique({
            where: {
              userId_subTopicId: {
                userId,
                subTopicId: id
              }
            }
          });

          // Update or create progress record
          const progressRecord = await tx.topicProgress.upsert({
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

          // Award XP and update enrollment ONLY if this is the first time the lesson is completed
          const wasNotCompletedBefore = !existingProgress || !existingProgress.completed;
          
          if (completed && wasNotCompletedBefore) {
            // Award XP (10 XP per lesson) using separate UserXP model
            await tx.userXP.upsert({
              where: { userId },
              update: { totalXP: { increment: 10 } },
              create: { userId, totalXP: 10 }
            });

            // Recalculate progress using optimized count queries
            const totalSubTopicsCount = await tx.subTopic.count({
              where: { topic: { subjectId } }
            });

            const completedSubTopicsCount = await tx.topicProgress.count({
              where: { 
                userId, 
                completed: true, 
                subTopic: { topic: { subjectId } } 
              }
            });

            const progressPercentage = Math.round((completedSubTopicsCount / totalSubTopicsCount) * 100);

            // Update Subject Enrollment progress
            await tx.subjectEnrollment.update({
              where: { userId_subjectId: { userId, subjectId } },
              data: { progress: progressPercentage }
            });

            // Generate Certificate if 100%
            if (progressPercentage === 100) {
              await tx.subjectCertificate.upsert({
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

          return progressRecord;
        });

        return successResponse(result);
      } catch (error) {
        if (error instanceof ApiError) {
           return handleApiError(error);
        }
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
