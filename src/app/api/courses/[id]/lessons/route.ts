import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrSetEnhanced } from "@/lib/cache-service-unified";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { handleApiError, successResponse, badRequestResponse } from '@/lib/api-utils';

interface SubTopic {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  type: string;
  isFree: boolean;
  durationMinutes: number;
  topicId: string;
  order: number;
}

// GET lessons for a course (now topics for a subject)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // subject ID
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const userId = req.headers.get("x-user-id");
      const userRole = req.headers.get("x-user-role");

      // Check if subject exists
      const subject = await prisma.subject.findFirst({
        where: {
          OR: [
            { id },
            { slug: id }
          ]
        }
      });

      if (!subject) {
        return badRequestResponse("المادة غير موجودة", "SUBJECT_NOT_FOUND");
      }

      // Use the actual subject ID for caching and subsequent queries
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

      // Get lessons (now subtopics) for this subject
      const lessons = await getOrSetEnhanced(
        `subject:${subjectId}:lessons`,
        async () => {
          return await prisma.subTopic.findMany({
            where: {
              topic: {
                subjectId: subjectId
              }
            },
            select: {
              id: true,
              title: true,
              description: true,
              content: true,
              videoUrl: true,
              type: true,
              isFree: true,
              durationMinutes: true,
              topicId: true,
              order: true,
              topic: {
                select: {
                  id: true,
                  title: true,
                  order: true
                }
              }
            },
            orderBy: [
              { topic: { order: 'asc' } },
              { order: 'asc' }
            ]
          });
        }
      ) as unknown as SubTopic[];

      // If userId is provided, get progress information
      let lessonProgress: Record<string, boolean> = {};
      if (userId && Array.isArray(lessons)) {
        const lessonIds = lessons.map((lesson) => lesson.id);
        const progressRecords = await prisma.topicProgress.findMany({
          where: {
            userId,
            subTopicId: { in: lessonIds }
          }
        });

        lessonProgress = progressRecords.reduce((acc: Record<string, boolean>, progress: any) => {
          acc[progress.subTopicId] = progress.completed;
          return acc;
        }, {} as Record<string, boolean>);
      }

      const sanitizedLessons = lessons.map((lesson: SubTopic & {topic?: {id: string;title: string;order: number;};}) => {
        const isAccessible = canAccessPaidContent || lesson.isFree;

        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          content: isAccessible ? lesson.content : null,
          videoUrl: isAccessible ? lesson.videoUrl : null,
          type: lesson.type,
          isFree: lesson.isFree,
          durationMinutes: lesson.durationMinutes,
          order: lesson.order,
          locked: !isAccessible,
          topic: lesson.topic
        };
      });

      return successResponse({
        lessons: sanitizedLessons,
        progress: lessonProgress,
        access: {
          enrolled: Boolean(enrollment),
          canAccessPaidContent
        }
      });
    } catch (error: unknown) {
      logger.error("Error fetching subject lessons:", error);
      return handleApiError(error);
    }
  });
}

// POST to create a new lesson (now subtopic)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // subject ID
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const body = (await req.json()) as { title?: string; description?: string; topicId?: string; order?: string | number };
      const { title, description, topicId, order } = body;

      // Check if subject exists
      const subject = await prisma.subject.findUnique({
        where: { id }
      });

      if (!subject) {
        return badRequestResponse("المادة غير موجودة", "SUBJECT_NOT_FOUND");
      }

      if (!title || !topicId) {
        return badRequestResponse("العنوان والموضوع مطلوبان");
      }

      // Create subtopic
      const newLesson = await prisma.subTopic.create({
        data: {
          title: title,
          description: description || null,
          topicId,
          order: Number(order) || 0
        }
      });

      return successResponse(newLesson, "تمت إضافة المخطوطة بنجاح", 201);
    } catch (error: unknown) {
      logger.error("Error creating lesson:", error);
      return handleApiError(error);
    }
  });
}
