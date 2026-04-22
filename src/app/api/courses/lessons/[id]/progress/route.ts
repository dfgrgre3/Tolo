import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  successResponse,
  badRequestResponse,
  handleApiError,
  ApiError,
  withAuth
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { EducationalCache } from "@/lib/cache";
import { handleLessonCompletion } from "@/lib/courses/course-integration-service";

type ProgressPayload = {
  completed?: boolean;
  positionSeconds?: number;
};

// POST to update lesson completion and/or video position
export async function POST(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params;
        const body = await req.json() as ProgressPayload;
        const completed = typeof body.completed === "boolean" ? body.completed : undefined;
        const positionSeconds =
        typeof body.positionSeconds === "number" && Number.isFinite(body.positionSeconds) ?
        Math.max(0, Math.round(body.positionSeconds)) :
        undefined;

        if (completed === undefined && positionSeconds === undefined) {
          return badRequestResponse("حالة الإكمال أو موضع المشاهدة مطلوب");
        }

        const result = await (prisma as any).$transaction(async (tx: any) => {
          const lesson = await tx.subTopic.findUnique({
            where: { id },
            select: {
              id: true,
              topic: {
                select: {
                  subjectId: true
                }
              }
            }
          });

          if (!lesson) {
            throw new ApiError("الدرس غير موجود", 404);
          }

          const subjectId = lesson.topic.subjectId;
          const enrollment = await tx.subjectEnrollment.findUnique({
            where: {
              userId_subjectId: {
                userId,
                subjectId
              }
            }
          });

          if (!enrollment && completed !== undefined) {
            throw new ApiError("يجب التسجيل في الدورة لتحديث الإكمال", 403);
          }

          const existingProgress = await tx.topicProgress.findUnique({
            where: {
              userId_subTopicId: {
                userId,
                subTopicId: id
              }
            }
          });

          const progressRecord = await tx.topicProgress.upsert({
            where: {
              userId_subTopicId: {
                userId,
                subTopicId: id
              }
            },
            update: {
              ...(completed !== undefined ?
              {
                completed,
                completedAt: completed ? new Date() : null
              } :
              {}),
              ...(positionSeconds !== undefined ? { lastVideoPosition: positionSeconds } : {})
            },
            create: {
              userId,
              subTopicId: id,
              completed: completed ?? false,
              completedAt: completed ? new Date() : null,
              lastVideoPosition: positionSeconds ?? 0
            }
          });

          const isMarkedCompleted = completed === true;
          const wasNotCompletedBefore = !existingProgress || !existingProgress.completed;
          const wasCompletedBefore = Boolean(existingProgress?.completed);

          let updatedEnrollment = enrollment;
          let integrationResult = null;

          if (enrollment && isMarkedCompleted && wasNotCompletedBefore) {
            updatedEnrollment = await tx.subjectEnrollment.update({
              where: { userId_subjectId: { userId, subjectId } },
              data: { completedLessonsCount: { increment: 1 } } as any
            });

            integrationResult = await handleLessonCompletion(userId, id, subjectId, tx);
          } else if (enrollment && completed === false && wasCompletedBefore) {
            updatedEnrollment = await tx.subjectEnrollment.update({
              where: { userId_subjectId: { userId, subjectId } },
              data: { completedLessonsCount: { decrement: 1 } } as any
            });
          }

          if (updatedEnrollment) {
            const totalCountKey = `subject:${subjectId}:totalSubTopics`;
            const totalSubTopicsCount = await EducationalCache.getOrSet(totalCountKey, async () => {
              return await prisma.subTopic.count({
                where: { topic: { subjectId } }
              });
            }, 3600);

            const progressPercentage = totalSubTopicsCount > 0 ?
            Math.min(
              100,
              Math.round((updatedEnrollment.completedLessonsCount / (totalSubTopicsCount as number)) * 100)
            ) :
            0;

            if (progressPercentage !== updatedEnrollment.progress) {
              updatedEnrollment = await tx.subjectEnrollment.update({
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
          ...(result.integration ?
          {
            xpAwarded: result.integration.xpAwarded,
            courseProgress: result.integration.courseProgress,
            isChapterComplete: result.integration.isChapterComplete,
            isCourseComplete: result.integration.isCourseComplete,
            certificateCreated: result.integration.certificateCreated,
            certificateId: result.integration.certificateId
          } :
          {})
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
{ params }: {params: Promise<{id: string;}>;})
{
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

        return successResponse(progress || { completed: false, lastVideoPosition: 0 });
      } catch (error) {
        logger.error("Error fetching lesson progress:", error);
        return handleApiError(error);
      }
    });
  });
}
