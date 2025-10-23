import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST to update lesson progress
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // lesson ID
    const { userId, completed, subject } = await request.json();

    if (!userId || completed === undefined || !subject) {
      return NextResponse.json(
        { error: "معرف المستخدم وحالة الإكمال والمادة مطلوبة" },
        { status: 400 }
      );
    }

    // Check if lesson exists
    const lesson = await prisma.subTopic.findUnique({
      where: { id }
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "الدرس غير موجود" },
        { status: 404 }
      );
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

    // If marking as completed, update enrollment progress
    if (completed) {
      // Get all lessons for this subject
      const subjectData = await prisma.subject.findFirst({
        where: { name: subject }
      });
      
      if (subjectData) {
        const subjectTopics = await prisma.topic.findMany({
          where: { subjectId: subjectData.id },
          include: { subTopics: true }
        });
        
        const allSubTopics = subjectTopics.flatMap(topic => topic.subTopics);
        const subTopicIds = allSubTopics.map(st => st.id);
        
        // Get user progress for all subtopics in this subject
        const userProgress = await prisma.topicProgress.findMany({
          where: {
            userId,
            subTopicId: { in: subTopicIds }
          }
        });
        
        const completedCount = userProgress.filter(p => p.completed).length;
        const totalCount = subTopicIds.length;
        const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        // Update subject enrollment with progress
        await prisma.subjectEnrollment.updateMany({
          where: {
            userId,
            subject: subjectData.name
          },
          data: {
            progress: progressPercentage
          }
        });
      }
    }

    return NextResponse.json(progressRecord);
  } catch (error) {
    console.error("Error updating lesson progress:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}

// GET lesson progress
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    const progress = await prisma.topicProgress.findUnique({
      where: {
        userId_subTopicId: {
          userId,
          subTopicId: id
        }
      }
    });

    return NextResponse.json(progress || { completed: false });
  } catch (error) {
    console.error("Error fetching lesson progress:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}
