import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { LessonType } from "@prisma/client";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  withAuth,
  successResponse,
  handleApiError,
  forbiddenResponse,
  badRequestResponse
} from "@/lib/api-utils";
import { getCourseCurriculum } from "@/lib/courses/advanced-course-service";
import { logger } from "@/lib/logger";

interface LessonInput {
  id: string;
  name: string;
  type?: LessonType;
  videoUrl?: string | null;
  duration?: number;
  isFree?: boolean;
  description?: string | null;
}

interface ChapterInput {
  id: string;
  name: string;
  subTopics?: LessonInput[];
}

export async function POST(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بتعديل المنهج");
      }

      try {
        const { id: subjectId } = await params;
        const body = (await req.json()) as {curriculum: ChapterInput[];};
        const { curriculum } = body;

        if (!Array.isArray(curriculum)) {
          return badRequestResponse("بيانات المنهج غير صالحة");
        }

        await (prisma as any).$transaction(async (tx: any) => {
          const existingTopics = await tx.topic.findMany({
            where: { subjectId },
            select: { id: true }
          });
          const existingTopicIds = existingTopics.map((topic: {id: string;}) => topic.id);

          const receivedTopicIds = curriculum
            .filter((chapter) => !chapter.id.startsWith("new-"))
            .map((chapter) => chapter.id);

          const topicsToDelete = existingTopicIds.filter((topicId: string) => !receivedTopicIds.includes(topicId));
          if (topicsToDelete.length > 0) {
            await tx.topic.deleteMany({
              where: { id: { in: topicsToDelete } }
            });
          }

          for (const [topicOrder, chapter] of curriculum.entries()) {
            const topic = chapter.id.startsWith("new-") ?
            await tx.topic.create({
              data: {
                subjectId,
                title: chapter.name,
                order: topicOrder
              }
            }) :
            await tx.topic.update({
              where: { id: chapter.id },
              data: {
                title: chapter.name,
                order: topicOrder
              }
            });

            const existingSubTopics = await tx.subTopic.findMany({
              where: { topicId: topic.id },
              select: { id: true }
            });
            const existingSubTopicIds = existingSubTopics.map((subTopic: {id: string;}) => subTopic.id);
            const receivedSubTopicIds = (chapter.subTopics || [])
              .filter((lesson) => !lesson.id.startsWith("new-"))
              .map((lesson) => lesson.id);

            const subTopicsToDelete = existingSubTopicIds.filter(
              (subTopicId: string) => !receivedSubTopicIds.includes(subTopicId)
            );
            if (subTopicsToDelete.length > 0) {
              await tx.subTopic.deleteMany({
                where: { id: { in: subTopicsToDelete } }
              });
            }

            for (const [lessonOrder, lesson] of (chapter.subTopics || []).entries()) {
              const lessonData = {
                topicId: topic.id,
                title: lesson.name,
                order: lessonOrder,
                type: lesson.type || LessonType.VIDEO,
                videoUrl: lesson.videoUrl || null,
                durationMinutes: lesson.duration || 0,
                isFree: lesson.isFree || false,
                description: lesson.description || null
              };

              if (lesson.id.startsWith("new-")) {
                await tx.subTopic.create({ data: lessonData });
              } else {
                await tx.subTopic.update({
                  where: { id: lesson.id },
                  data: lessonData
                });
              }
            }
          }
        });

        return successResponse({ success: true }, "تم حفظ المنهج بنجاح");
      } catch (error: unknown) {
        logger.error("Error saving curriculum:", error);
        return handleApiError(error);
      }
    });
  });
}

export async function GET(
request: NextRequest,
{ params }: {params: Promise<{id: string;}>;})
{
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const userId = req.headers.get("x-user-id") || undefined;
      const userRole = req.headers.get("x-user-role");

      const subject = await prisma.subject.findFirst({
        where: {
          OR: [
            { id },
            { slug: id }
          ]
        },
        select: { id: true }
      });

      if (!subject) {
        return badRequestResponse("الدورة غير موجودة");
      }

      const subjectId = subject.id;
      const isAdmin = userRole === "ADMIN";
      const enrollment = userId ?
      await prisma.subjectEnrollment.findUnique({
        where: {
          userId_subjectId: {
            userId,
            subjectId
          }
        },
        select: { id: true }
      }) :
      null;
      const canAccessPaidContent = Boolean(enrollment) || isAdmin;

      const curriculum = await getCourseCurriculum(subjectId, userId);

      const sanitizedCurriculum = curriculum.map((chapter: any) => ({
        id: chapter.id,
        name: chapter.title ?? chapter.name ?? "",
        description: chapter.description ?? null,
        order: chapter.order ?? 0,
        subTopics: (chapter.subTopics || []).map((lesson: any) => {
          const isAccessible = canAccessPaidContent || lesson.isFree;

          return {
            id: lesson.id,
            name: lesson.title ?? lesson.name ?? "",
            description: lesson.description ?? null,
            content: isAccessible ? lesson.content : null,
            videoUrl: isAccessible ? lesson.videoUrl : null,
            type: lesson.type,
            order: lesson.order ?? 0,
            durationMinutes: lesson.durationMinutes ?? 0,
            isFree: lesson.isFree ?? false,
            completed: lesson.completed ?? false,
            completedAt: lesson.completedAt ?? null,
            attachments: isAccessible ? lesson.attachments : [],
            locked: !isAccessible
          };
        })
      }));

      return successResponse({
        curriculum: sanitizedCurriculum,
        subjectId,
        access: {
          enrolled: Boolean(enrollment),
          canAccessPaidContent
        },
        totalChapters: sanitizedCurriculum.length,
        totalLessons: sanitizedCurriculum.reduce(
          (acc: number, chapter: {subTopics?: unknown[];}) => acc + (chapter.subTopics?.length || 0),
          0
        )
      });
    } catch (error: unknown) {
      return handleApiError(error);
    }
  });
}
