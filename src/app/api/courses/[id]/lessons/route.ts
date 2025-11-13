import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSetEnhanced } from "@/lib/cache-service-unified";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

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
      return NextResponse.json(
        { error: "المادة غير موجودة" },
        { status: 404 }
      );
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
    if (userId) {
      const lessonIds = lessons.map((lesson: any) => lesson.id);
      const progressRecords = await prisma.topicProgress.findMany({
        where: {
          userId,
          subTopicId: { in: lessonIds }
        }
      });
      
      lessonProgress = progressRecords.reduce((acc: any, progress: any) => {
        acc[progress.subTopicId] = progress.completed;
        return acc;
      }, {});
    }

    return NextResponse.json({
      lessons,
      progress: lessonProgress
    });
  } catch (error) {
    logger.error("Error fetching subject lessons:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "المادة غير موجودة" },
        { status: 404 }
      );
    }

    // Create subtopic
    const newLesson = await prisma.subTopic.create({
      data: {
        name: title,
        nameAr: title, // Using same name for Arabic
        description,
        topicId,
        order
      }
    });

    // Invalidate cache (optional: implement cache invalidation strategy)

    return NextResponse.json(newLesson);
  } catch (error) {
    logger.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
    }
  });
}
