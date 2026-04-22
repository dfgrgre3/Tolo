import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CacheService } from "@/lib/cache";
import { logger } from "@/lib/logger";

// GET /api/admin/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week";

    // Use Distributed Cache to support multiple pod instances
    const cacheKey = `admin:dashboard:stats:${period}`;
    
    const responseData = await CacheService.getOrSet(cacheKey, async () => {
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

      // Get basic counts via parallel execution
      const [
        totalUsers,
        totalSubjects,
        totalExams,
        totalResources,
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
        prisma.user.count({ where: { isDeleted: false } }),
        prisma.subject.count({ where: { isActive: true } }),
        prisma.exam.count(),
        prisma.resource.count(),
        prisma.challenge.count({ where: { isActive: true } }),
        prisma.user.count({ where: { createdAt: { gte: todayStart }, isDeleted: false } }),
        prisma.user.count({ where: { createdAt: { gte: periodStart }, isDeleted: false } }),
        prisma.user.count({
          where: {
            createdAt: { gte: previousPeriodStart, lt: periodStart },
            isDeleted: false
          },
        }),
        prisma.studySession.aggregate({
          where: { startTime: { gte: periodStart }, isDeleted: false },
          _sum: { durationMin: true },
        }),
        prisma.studySession.aggregate({
          where: { startTime: { gte: previousPeriodStart, lt: periodStart }, isDeleted: false },
          _sum: { durationMin: true },
        }),
        prisma.task.count({
          where: {
            completedAt: { gte: periodStart },
            status: "COMPLETED",
            isDeleted: false
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

      const userGrowth = await prisma.$queryRaw<any[]>`
        SELECT 
          TO_CHAR("createdAt", 'YYYY-MM') as month,
          COUNT(id) as count
        FROM "User"
        WHERE "createdAt" >= ${sixMonthsAgo} AND "isDeleted" = false
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `;

      // Get activity by day of week
      const activityByDay = await prisma.$queryRaw<any[]>`
        SELECT 
          EXTRACT(DOW FROM "startTime") as day,
          COUNT(id) as sessions
        FROM "StudySession"
        WHERE "startTime" >= ${periodStart} AND "isDeleted" = false
        GROUP BY EXTRACT(DOW FROM "startTime")
        ORDER BY day ASC
      `;

      // Get recent activity (Optimized Union)
      const recentActivity = await prisma.$queryRaw<any[]>`
        (SELECT 'user' as type, id, "createdAt" as time, NULL as title FROM "User" WHERE "isDeleted" = false ORDER BY "createdAt" DESC LIMIT 5)
        UNION ALL
        (SELECT 'exam' as type, id, "takenAt" as time, NULL as title FROM "ExamResult" ORDER BY "takenAt" DESC LIMIT 5)
        ORDER BY time DESC
        LIMIT 10
      `;

      // Get upcoming events
      const upcomingEvents = await prisma.event.findMany({
        where: { startDate: { gte: now }, isPublic: true },
        take: 5,
        orderBy: { startDate: "asc" },
        select: { id: true, title: true, startDate: true, location: true },
      });

      // Calculate Trends
      const userGrowthTrend = Number(newUsersLastWeek) > 0
        ? Math.round(((Number(newUsersThisWeek) - Number(newUsersLastWeek)) / Number(newUsersLastWeek)) * 100)
        : (Number(newUsersThisWeek) > 0 ? 100 : 0);

      const studyMinutesThisWeek = Number(totalStudyMinutesThisWeek._sum.durationMin || 0);
      const studyMinutesLastWeek = Number(totalStudyMinutesLastWeek._sum.durationMin || 0);
      const studyTrend = studyMinutesLastWeek > 0
        ? Math.round(((studyMinutesThisWeek - studyMinutesLastWeek) / studyMinutesLastWeek) * 100)
        : (studyMinutesThisWeek > 0 ? 100 : 0);

      const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

      return {
        stats: {
          totalUsers: Number(totalUsers),
          totalSubjects: Number(totalSubjects),
          totalExams: Number(totalExams),
          totalResources: Number(totalResources),
          activeChallenges: Number(activeChallenges),
          newUsersToday: Number(newUsersToday),
          newUsersThisWeek: Number(newUsersThisWeek),
        },
        trends: { userGrowth: userGrowthTrend, studyTime: studyTrend },
        charts: {
            userGrowth: (userGrowth || []).map((item: any) => ({
              month: monthNames[parseInt(item.month.split("-")[1]) - 1],
              users: Number(item.count),
            })),
            activity: (activityByDay || []).map((item: any) => ({
              day: dayNames[Math.floor(Number(item.day))],
              sessions: Number(item.sessions),
            })),
        },
        activity: {
          tasksCompleted: Number(tasksCompletedThisWeek),
          examsTaken: Number(examsTakenThisWeek),
          achievementsEarned: Number(achievementsEarnedThisWeek),
          studyMinutes: studyMinutesThisWeek,
        },
        recentActivity: (recentActivity || []).map((activity: any) => ({
          ...activity,
          id: String(activity.id),
        })),
        upcomingEvents,
      };
    }, 300); // 5 minutes cache

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
