import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/analytics - Get comprehensive analytics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "week"; // week, month, year

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get user statistics
    const [
      totalUsers,
      newUsers,
      activeUsers,
      usersByRole,
      usersByGender,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.user.count({
        where: { lastLogin: { gte: startDate } },
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { id: true },
      }),
      prisma.user.groupBy({
        by: ["gender"],
        _count: { id: true },
        where: { gender: { not: null } },
      }),
    ]);

    // Get content statistics
    const [
      totalSubjects,
      totalBooks,
      totalExams,
      totalResources,
      totalBlogPosts,
      totalForumPosts,
    ] = await Promise.all([
      prisma.subject.count(),
      prisma.book.count(),
      prisma.exam.count(),
      prisma.resource.count(),
      prisma.blogPost.count(),
      prisma.forumPost.count(),
    ]);

    // Get activity statistics
    const [
      totalStudySessions,
      studySessionsDuration,
      totalTasksCompleted,
      totalExamsTaken,
    ] = await Promise.all([
      prisma.studySession.count({
        where: { startTime: { gte: startDate } },
      }),
      prisma.studySession.aggregate({
        where: { startTime: { gte: startDate } },
        _sum: { durationMin: true },
      }),
      prisma.task.count({
        where: {
          completedAt: { gte: startDate },
          status: "COMPLETED",
        },
      }),
      prisma.examResult.count({
        where: { takenAt: { gte: startDate } },
      }),
    ]);

    // Get gamification statistics
    const [
      totalAchievementsEarned,
      totalChallengesCompleted,
      totalXP,
      topUsers,
    ] = await Promise.all([
      prisma.userAchievement.count({
        where: { earnedAt: { gte: startDate } },
      }),
      prisma.challengeCompletion.count({
        where: { completedAt: { gte: startDate } },
      }),
      prisma.user.aggregate({
        _sum: { totalXP: true },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { totalXP: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          totalXP: true,
          level: true,
        },
      }),
    ]);

    // Get daily active users for the period
    const dailyActiveUsers = await prisma.$queryRaw`
      SELECT DATE("lastLogin") as date, COUNT(DISTINCT id) as count
      FROM "User"
      WHERE "lastLogin" >= ${startDate}
      GROUP BY DATE("lastLogin")
      ORDER BY date ASC
    `;

    // Get new registrations per day
    const dailyRegistrations = await prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(id) as count
      FROM "User"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Get subject enrollment stats
    const subjectEnrollments = await prisma.subject.findMany({
      take: 10,
      orderBy: {
        enrollments: {
          _count: "desc",
        },
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        _count: {
          select: { enrollments: true },
        },
      },
    });

    // Get recent activity
    const recentActivity = await prisma.userInteraction.findMany({
      take: 20,
      orderBy: { timestamp: "desc" },
      select: {
        id: true,
        type: true,
        itemType: true,
        timestamp: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({
      period,
      users: {
        total: Number(totalUsers),
        new: Number(newUsers),
        active: Number(activeUsers),
        byRole: (usersByRole || []).reduce((acc, item) => {
          acc[item.role] = Number(item._count.id);
          return acc;
        }, {} as Record<string, number>),
        byGender: (usersByGender || []).reduce((acc, item) => {
          if (item.gender) acc[item.gender] = Number(item._count.id);
          return acc;
        }, {} as Record<string, number>),
      },
      content: {
        subjects: Number(totalSubjects),
        books: Number(totalBooks),
        exams: Number(totalExams),
        resources: Number(totalResources),
        blogPosts: Number(totalBlogPosts),
        forumPosts: Number(totalForumPosts),
      },
      activity: {
        studySessions: Number(totalStudySessions),
        totalStudyMinutes: Number(studySessionsDuration._sum.durationMin || 0),
        tasksCompleted: Number(totalTasksCompleted),
        examsTaken: Number(totalExamsTaken),
      },
      gamification: {
        achievementsEarned: Number(totalAchievementsEarned),
        challengesCompleted: Number(totalChallengesCompleted),
        totalXP: Number(totalXP._sum.totalXP || 0),
        topUsers: (topUsers || []).map(u => ({
          ...u,
          totalXP: Number(u.totalXP),
        })),
      },
      charts: {
        dailyActiveUsers: (dailyActiveUsers as any[] || []).map(d => ({
          date: d.date,
          count: Number(d.count),
        })),
        dailyRegistrations: (dailyRegistrations as any[] || []).map(d => ({
          date: d.date,
          count: Number(d.count),
        })),
      },
      popular: {
        subjects: (subjectEnrollments || []).map(s => ({
          ...s,
          _count: {
            enrollments: Number(s._count.enrollments),
          },
        })),
      },
      recentActivity,
    });
  } catch (error) {
    console.error("DEBUG: Analytics API Error details:", error);
    return NextResponse.json(
      { 
        error: "حدث خطأ أثناء جلب التحليلات",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
