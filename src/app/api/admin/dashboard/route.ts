import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Cache configuration
const CACHE_DURATION = 60; // 1 minute cache
const cache = new Map<string, { data: any; timestamp: number }>();

// Helper to get cached data
function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 1000) {
    return cached.data;
  }
  return null;
}

// Helper to set cached data
function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// GET /api/admin/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week";

    // Check cache first
    const cacheKey = `dashboard-${period}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate date ranges based on period
    let periodStart: Date;
    let previousPeriodStart: Date;

    switch (period) {
      case "today":
        periodStart = todayStart;
        previousPeriodStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "month":
        periodStart = new Date(todayStart);
        periodStart.setMonth(periodStart.getMonth() - 1);
        previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
        break;
      case "year":
        periodStart = new Date(todayStart);
        periodStart.setFullYear(periodStart.getFullYear() - 1);
        previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
        break;
      case "week":
      default:
        periodStart = new Date(todayStart);
        periodStart.setDate(periodStart.getDate() - 7);
        previousPeriodStart = new Date(periodStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get basic counts
    const [
      totalUsers,
      totalSubjects,
      totalExams,
      activeChallenges,
      newUsersToday,
      newUsersThisWeek,
      newUsersLastWeek,
      totalStudyMinutesThisWeek,
      totalStudyMinutesLastWeek,
      tasksCompletedThisWeek,
      examsTakenThisWeek,
      achievementsEarnedThisWeek,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subject.count({ where: { isActive: true } }),
      prisma.exam.count(),
      prisma.challenge.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: periodStart } } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: periodStart,
          },
        },
      }),
      prisma.studySession.aggregate({
        where: { startTime: { gte: periodStart } },
        _sum: { durationMin: true },
      }),
      prisma.studySession.aggregate({
        where: {
          startTime: {
            gte: previousPeriodStart,
            lt: periodStart,
          },
        },
        _sum: { durationMin: true },
      }),
      prisma.task.count({
        where: {
          completedAt: { gte: periodStart },
          status: "COMPLETED",
        },
      }),
      prisma.examResult.count({
        where: { takenAt: { gte: periodStart } },
      }),
      prisma.userAchievement.count({
        where: { earnedAt: { gte: periodStart } },
      }),
    ]);

    // Get user growth by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowth = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(id) as count
      FROM "User"
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `;

    // Get activity by day of week
    const activityByDay = await prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM "startTime") as day,
        COUNT(id) as sessions
      FROM "StudySession"
      WHERE "startTime" >= ${periodStart}
      GROUP BY EXTRACT(DOW FROM "startTime")
      ORDER BY day ASC
    `;

    // Get recent activity
    const recentActivity = await prisma.$queryRaw`
      (
        SELECT 'user' as type, id, "createdAt" as time, NULL as title
        FROM "User"
        ORDER BY "createdAt" DESC
        LIMIT 2
      )
      UNION ALL
      (
        SELECT 'exam' as type, id, "takenAt" as time, NULL as title
        FROM "ExamResult"
        ORDER BY "takenAt" DESC
        LIMIT 2
      )
      UNION ALL
      (
        SELECT 'achievement' as type, id, "earnedAt" as time, NULL as title
        FROM "UserAchievement"
        ORDER BY "earnedAt" DESC
        LIMIT 2
      )
      UNION ALL
      (
        SELECT 'challenge' as type, id, "createdAt" as time, title
        FROM "Challenge"
        ORDER BY "createdAt" DESC
        LIMIT 2
      )
      ORDER BY time DESC
      LIMIT 10
    `;

    // Get upcoming events
    const upcomingEvents = await prisma.event.findMany({
      where: {
        startDate: { gte: now },
        isPublic: true,
      },
      take: 5,
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        title: true,
        startDate: true,
        location: true,
      },
    });

    // Calculate trends
    const userGrowthTrend = Number(newUsersLastWeek) > 0
      ? Math.round(((Number(newUsersThisWeek) - Number(newUsersLastWeek)) / Number(newUsersLastWeek)) * 100)
      : (Number(newUsersThisWeek) > 0 ? 100 : 0);

    const studyMinutesThisWeek = Number(totalStudyMinutesThisWeek._sum.durationMin || 0);
    const studyMinutesLastWeek = Number(totalStudyMinutesLastWeek._sum.durationMin || 0);
    const studyTrend = studyMinutesLastWeek > 0
      ? Math.round(((studyMinutesThisWeek - studyMinutesLastWeek) / studyMinutesLastWeek) * 100)
      : (studyMinutesThisWeek > 0 ? 100 : 0);

    // Format day names in Arabic
    const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const activityData = (activityByDay as Array<{ day: number; sessions: number | bigint }>).map((item) => ({
      day: dayNames[Math.floor(Number(item.day))],
      sessions: Number(item.sessions),
    }));

    // Format month names in Arabic
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const userGrowthData = (userGrowth as Array<{ month: string; count: number | bigint }>).map((item) => {
      const [year, month] = item.month.split("-");
      return {
        month: monthNames[parseInt(month) - 1],
        users: Number(item.count),
      };
    });

    const responseData = {
      stats: {
        totalUsers: Number(totalUsers),
        totalSubjects: Number(totalSubjects),
        totalExams: Number(totalExams),
        activeChallenges: Number(activeChallenges),
        newUsersToday: Number(newUsersToday),
        newUsersThisWeek: Number(newUsersThisWeek),
      },
      trends: {
        userGrowth: userGrowthTrend,
        studyTime: studyTrend,
      },
      charts: {
        userGrowth: userGrowthData,
        activity: activityData,
      },
      activity: {
        tasksCompleted: Number(tasksCompletedThisWeek),
        examsTaken: Number(examsTakenThisWeek),
        achievementsEarned: Number(achievementsEarnedThisWeek),
        studyMinutes: studyMinutesThisWeek,
      },
      recentActivity: (recentActivity as any[]).map(activity => ({
        ...activity,
        id: String(activity.id),
        time: activity.time,
      })),
      upcomingEvents,
    };

    // Cache the response
    setCachedData(cacheKey, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("DEBUG: Dashboard API Error details:", error);
    return NextResponse.json(
      {
        error: "حدث خطأ أثناء جلب البيانات",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
