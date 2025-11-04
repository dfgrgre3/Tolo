import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth-enhanced";

// GET user stats by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user and ensure they can only access their own stats
    const authUser = verifyToken(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.userId !== id) {
      return NextResponse.json({ error: "Forbidden: Can only access your own stats" }, { status: 403 });
    }

    // Get completed tasks count
    const completedTasks = await prisma.task.count({
      where: {
        userId: id,
        completed: true
      }
    });

    // Get total study time in minutes
    const studySessions = await prisma.studySession.findMany({
      where: {
        userId: id
      },
      select: {
        duration: true
      }
    });

    const totalStudyTime = studySessions.reduce((total: number, session: any) => total + session.duration, 0);

    // Get courses enrolled count
    const coursesEnrolled = await prisma.enrollment.count({
      where: {
        userId: id
      }
    });

    // Get exams taken count
    const examsTaken = await prisma.examResult.count({
      where: {
        userId: id
      }
    });

    // Get forum posts count
    const forumPosts = await prisma.forumPost.count({
      where: {
        authorId: id
      }
    });

    // Get blog posts count
    const blogPosts = await prisma.blogPost.count({
      where: {
        authorId: id
      }
    });

    const stats = {
      completedTasks,
      totalStudyTime,
      coursesEnrolled,
      examsTaken,
      forumPosts,
      blogPosts
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب إحصائيات المستخدم" },
      { status: 500 }
    );
  }
}
