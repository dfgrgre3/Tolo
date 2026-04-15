import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@/lib/db";
import { LessonType } from "@prisma/client";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, handleApiError, forbiddenResponse, badRequestResponse } from "@/lib/api-utils";
import { getCourseCurriculum } from "@/lib/courses/advanced-course-service";
import { logger } from '@/lib/logger';

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
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨طھط¹ط¯ظٹظ„ ط§ظ„ظ…ظ†ظ‡ط¬");
      }

      try {
        const { id: subjectId } = await params;
        const body = (await req.json()) as { curriculum: ChapterInput[] };
        const { curriculum } = body;

        if (!Array.isArray(curriculum)) {
          return badRequestResponse("ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†ظ‡ط¬ ط؛ظٹط± طµط§ظ„ط­ط©");
        }

        // Use a transaction to ensure data integrity
        await (prisma as any).$transaction(async (tx: any) => {
          // Get existing topic IDs to know what to delete
          const existingTopics = await tx.topic.findMany({
            where: { subjectId },
            select: { id: true },
          });
          const existingTopicIds = existingTopics.map((t) => t.id);

          const receivedTopicIds = curriculum
            .filter((c) => !c.id.startsWith("new-"))
            .map((c) => c.id);

          // Delete topics that are no longer in the curriculum
          const topicsToDelete = existingTopicIds.filter((id) => !receivedTopicIds.includes(id));
          if (topicsToDelete.length > 0) {
            await tx.topic.deleteMany({
              where: { id: { in: topicsToDelete } },
            });
          }

          // Process each chapter (topic)
          for (const [topicOrder, chapter] of curriculum.entries()) {
            const isNewTopic = chapter.id.startsWith("new-");

            let topic;
            if (isNewTopic) {
              topic = await tx.topic.create({
                data: {
                  subjectId,
                  title: chapter.name,
                  order: topicOrder,
                },
              });
            } else {
              topic = await tx.topic.update({
                where: { id: chapter.id },
                data: {
                  title: chapter.name,
                  order: topicOrder,
                },
              });
            }

            // Handle lessons (subtopics)
            const existingSubTopics = await tx.subTopic.findMany({
              where: { topicId: topic.id },
              select: { id: true },
            });
            const existingSubTopicIds = existingSubTopics.map((st) => st.id);

            const receivedSubTopicIds = (chapter.subTopics || [])
              .filter((l) => !l.id.startsWith("new-"))
              .map((l) => l.id);

            // Delete subtopics that are no longer in the chapter
            const subTopicsToDelete = existingSubTopicIds.filter((id) => !receivedSubTopicIds.includes(id));
            if (subTopicsToDelete.length > 0) {
              await tx.subTopic.deleteMany({
                where: { id: { in: subTopicsToDelete } },
              });
            }


            // Process each lesson
            for (const [lessonOrder, lesson] of (chapter.subTopics || []).entries()) {
              const isNewLesson = lesson.id.startsWith("new-");
              const lessonData = {
                topicId: topic.id,
                title: lesson.name,
                order: lessonOrder,
                type: lesson.type || LessonType.VIDEO,
                videoUrl: lesson.videoUrl || null,
                duration: lesson.duration || 0,
                isFree: lesson.isFree || false,
                description: lesson.description || null,
              };

              if (isNewLesson) {
                await tx.subTopic.create({ data: lessonData });
              } else {
                await tx.subTopic.update({
                  where: { id: lesson.id },
                  data: lessonData,
                });
              }
            }
          }
        });

        return successResponse({ success: true }, "طھظ… ط­ظپط¸ ط§ظ„ظ…ظ†ظ‡ط¬ ط¨ظ†ط¬ط§ط­");
      } catch (error: unknown) {
        logger.error("Error saving curriculum:", error);
        return handleApiError(error);
      }
    });
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const searchParams = new URL(req.url).searchParams;
      const userId = searchParams.get("userId") || req.headers.get("x-user-id");

      const curriculum = (await getCourseCurriculum(id, userId || undefined)) as { subTopics?: any[] }[];

      return successResponse({
        curriculum,
        subjectId: id,
        totalChapters: curriculum.length,
        totalLessons: curriculum.reduce((acc, c) => acc + (c.subTopics?.length || 0), 0),
      });
    } catch (error: unknown) {
      return handleApiError(error);
    }
  });
}

