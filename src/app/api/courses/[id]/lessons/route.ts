import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrSetEnhanced } from "@/lib/cache-service-unified";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { handleApiError, successResponse, badRequestResponse } from '@/lib/api-utils';

// GET lessons for a course (now topics for a subject)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // subject ID
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get("userId");

      // Check if subject exists
      const subject = await prisma.subject.findUnique({
        where: { id }
      });

      if (!subject) {
        return badRequestResponse("المادة غير موجودة", "SUBJECT_NOT_FOUND");
      }

      // Get lessons (now subtopics) for this subject
      const lessons = await getOrSetEnhanced(
        `subject:${id}:lessons`,
        async () => {
          return await prisma.subTopic.findMany({
            where: {
              topic: {
                subjectId: id
              }
            },
            include: {
              topic: true
            },
            orderBy: [
              { topic: { order: 'asc' } },
              { order: 'asc' }
            ]
          });
        }
      );

      // If userId is provided, get progress information
      let lessonProgress = {};
      if (userId && Array.isArray(lessons)) {
        const lessonIds = (lessons as any[]).map((lesson: any) => lesson.id);
        const progressRecords = await prisma.topicProgress.findMany({
          where: {
            userId,
            subTopicId: { in: lessonIds }
          }
        });

        lessonProgress = progressRecords.reduce((acc: any, progress: any) => {
          acc[progress.subTopicId] = progress.completed;
          return acc;
        }, {} as Record<string, boolean>);
      }

      return successResponse({
        lessons,
        progress: lessonProgress
      });
    } catch (error) {
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
      const { title, description, topicId, order } = await req.json();

      // Check if subject exists
      const subject = await prisma.subject.findUnique({
        where: { id }
      });

      if (!subject) {
        return badRequestResponse("المادة غير موجودة", "SUBJECT_NOT_FOUND");
      }

      // Create subtopic
      const newLesson = await prisma.subTopic.create({
        data: {
          name: title,
          description,
          topicId,
          order: Number(order) || 0
        }
      });

      return successResponse(newLesson, "تمت إضافة المخطوطة بنجاح", 201);
    } catch (error) {
      logger.error("Error creating lesson:", error);
      return handleApiError(error);
    }
  });
}
