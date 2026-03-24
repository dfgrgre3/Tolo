import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LessonType } from "@prisma/client";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, handleApiError, forbiddenResponse, badRequestResponse } from "@/lib/api-utils";
import { getCourseCurriculum } from "@/lib/courses/advanced-course-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بتعديل المنهج");
      }

      try {
        const { id: subjectId } = await params;
        const { curriculum } = await req.json();

        if (!Array.isArray(curriculum)) {
          return badRequestResponse("بيانات المنهج غير صالحة");
        }

        // Use a transaction to ensure data integrity
        await prisma.$transaction(async (tx: any) => {
          // Get existing topic IDs to know what to delete
          const existingTopics = await tx.topic.findMany({
            where: { subjectId },
            select: { id: true },
          });
          const existingTopicIds = existingTopics.map((t: any) => t.id);

          const receivedTopicIds = curriculum
            .filter((c: any) => !c.id.startsWith("new-"))
            .map((c: any) => c.id);

          // Delete topics that are no longer in the curriculum
          const topicsToDelete = existingTopicIds.filter((id: string) => !receivedTopicIds.includes(id));
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
                  name: chapter.name,
                  order: topicOrder,
                },
              });
            } else {
              topic = await tx.topic.update({
                where: { id: chapter.id },
                data: {
                  name: chapter.name,
                  order: topicOrder,
                },
              });
            }

            // Handle lessons (subtopics)
            const existingSubTopics = await tx.subTopic.findMany({
              where: { topicId: topic.id },
              select: { id: true },
            });
            const existingSubTopicIds = existingSubTopics.map((st: any) => st.id);

            const receivedSubTopicIds = (chapter.subTopics || [])
              .filter((l: any) => !l.id.startsWith("new-"))
              .map((l: any) => l.id);

            // Delete subtopics that are no longer in the chapter
            const subTopicsToDelete = existingSubTopicIds.filter((id: string) => !receivedSubTopicIds.includes(id));
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
                name: lesson.name,
                order: lessonOrder,
                type: (lesson.type || "VIDEO") as LessonType,
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

        return successResponse({ success: true }, "تم حفظ المنهج بنجاح");
      } catch (error) {
        console.error("Error saving curriculum:", error);
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

      const curriculum = (await getCourseCurriculum(id, userId || undefined)) as any[];

      return successResponse({
        curriculum,
        subjectId: id,
        totalChapters: curriculum.length,
        totalLessons: curriculum.reduce((acc: number, c: any) => acc + (c.subTopics?.length || 0), 0),
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

