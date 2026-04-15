import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, badRequestResponse, handleApiError, ApiError, withAuth } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { Prisma } from "@prisma/client";
import { EducationalCache } from "@/lib/cache";
import { handleLessonCompletion } from "@/lib/courses/course-integration-service";

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
          return badRequestResponse("ط­ط§ظ„ط© ط§ظ„ط¥ظƒظ…ط§ظ„ ظˆط§ظ„ظ…ط§ط¯ط© ظ…ط·ظ„ظˆط¨ط©");
        }

        // Use transaction for consistency and to prevent race conditions
        const result = await (prisma as any).$transaction(async (tx: any) => {
          // Check if lesson exists and get subject details
          const lesson = await tx.subTopic.findUnique({
            where: { id },
            select: { 
              id: true,
              topic: { select: { subjectId: true } }
            }
          });

          if (!lesson) {
             throw new ApiError("ط§ظ„ط¯ط±ط³ ط؛ظٹط± ظ…ظˆط¬ظˆط¯", 404);
          }

          const subjectId = lesson.topic.subjectId;

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
            update: { completed },
            create: {
              userId,
              subTopicId: id,
              completed
            }
          });

          // Optimized Progress Calculation
          const isMarkedCompleted = completed === true;
          const wasNotCompletedBefore = !existingProgress || !existingProgress.completed;
          const wasCompletedBefore = existingProgress && existingProgress.completed;

          let updatedEnrollment;
          let integrationResult = null;
          
          if (isMarkedCompleted && wasNotCompletedBefore) {
            // New completion: Increment counter
            updatedEnrollment = (await tx.subjectEnrollment.update({
              where: { userId_subjectId: { userId, subjectId } },
              data: { completedLessonsCount: { increment: 1 } } as any
            })) as any;
            
            // Full integration: XP, achievements, notifications, certificates
            integrationResult = await handleLessonCompletion(userId, id, subjectId, tx);
          } else if (!isMarkedCompleted && wasCompletedBefore) {
            // Un-completion: Decrement counter
            updatedEnrollment = (await tx.subjectEnrollment.update({
              where: { userId_subjectId: { userId, subjectId } },
              data: { completedLessonsCount: { decrement: 1 } } as any
            })) as any;
          } else {
            // No change in completion status
            updatedEnrollment = await tx.subjectEnrollment.findUnique({
               where: { userId_subjectId: { userId, subjectId } }
            });
          }

          if (updatedEnrollment) {
            // Recalculate percentage using cached total count
            const totalCountKey = `subject:${subjectId}:totalSubTopics`;
            const totalSubTopicsCount = await EducationalCache.getOrSet(totalCountKey, async () => {
              return await prisma.subTopic.count({
                where: { topic: { subjectId } }
              });
            }, 3600); // Cache for 1 hour

            const progressPercentage = totalSubTopicsCount > 0 
              ? Math.min(100, Math.round(((updatedEnrollment as any).completedLessonsCount / (totalSubTopicsCount as number)) * 100))
              : 0;

            if (progressPercentage !== updatedEnrollment.progress) {
              await tx.subjectEnrollment.update({
                where: { id: updatedEnrollment.id },
                data: { progress: progressPercentage }
              });
            }
          }

          return { 
            progress: progressRecord, 
            integration: integrationResult 
          };
        });

        return successResponse({
          ...result.progress,
          ...(result.integration ? {
            xpAwarded: result.integration.xpAwarded,
            courseProgress: result.integration.courseProgress,
            isChapterComplete: result.integration.isChapterComplete,
            isCourseComplete: result.integration.isCourseComplete,
            certificateCreated: result.integration.certificateCreated,
          } : {}),
        });
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

