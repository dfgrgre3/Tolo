import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";

function ensureAdmin(userRole: string) {
  return userRole === "ADMIN";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بالوصول إلى تحليلات الدورات");
      }

      try {
        const { id } = await params;

        const course = await prisma.subject.findUnique({
          where: { id },
          select: { id: true, name: true, price: true },
        });

        if (!course) {
          return notFoundResponse("الدورة غير موجودة");
        }

        // Get enrollment trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const enrollments = await prisma.subjectEnrollment.findMany({
          where: {
            subjectId: id,
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        });

        // Group by day
        const enrollmentsByDay: Record<string, number> = {};
        for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          const key = d.toISOString().split("T")[0];
          enrollmentsByDay[key] = 0;
        }
        for (const e of enrollments) {
          const key = e.createdAt.toISOString().split("T")[0];
          if (enrollmentsByDay[key] !== undefined) {
            enrollmentsByDay[key]++;
          }
        }

        const enrollmentTrends = Object.entries(enrollmentsByDay).map(([date, count]) => ({
          date,
          count,
        }));

        // Total enrollment count
        const totalEnrollments = await prisma.subjectEnrollment.count({
          where: { subjectId: id },
        });

        // Revenue calculation
        const revenue = totalEnrollments * (course.price || 0);
        const recentRevenue = enrollments.length * (course.price || 0);

        // Progress distribution
        const progressData = await prisma.subjectEnrollment.findMany({
          where: { subjectId: id },
          select: { progress: true },
        });

        const progressDistribution = {
          notStarted: progressData.filter((p) => p.progress === 0).length,
          inProgress: progressData.filter((p) => p.progress > 0 && p.progress < 50).length,
          halfWay: progressData.filter((p) => p.progress >= 50 && p.progress < 100).length,
          completed: progressData.filter((p) => p.progress >= 100).length,
        };

        const avgProgress =
          progressData.length > 0
            ? Math.round(progressData.reduce((sum, p) => sum + p.progress, 0) / progressData.length)
            : 0;

        // Content performance: topic count + lessons per topic
        const topics = await prisma.topic.findMany({
          where: { subjectId: id },
          include: {
            _count: { select: { subTopics: true } },
            subTopics: {
              select: { duration: true, type: true, isFree: true },
            },
          },
          orderBy: { order: "asc" },
        });

        const contentPerformance = topics.map((topic) => ({
          name: topic.name,
          lessonsCount: topic._count.subTopics,
          totalDuration: topic.subTopics.reduce((sum, s) => sum + (s.duration || 0), 0),
          freeCount: topic.subTopics.filter((s) => s.isFree).length,
          videoCount: topic.subTopics.filter((s) => s.type === "VIDEO").length,
        }));

        // Reviews distribution
        const reviews = await prisma.subjectReview.findMany({
          where: { subjectId: id },
          select: { rating: true, createdAt: true },
        });

        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const r of reviews) {
          if (ratingDistribution[r.rating] !== undefined) {
            ratingDistribution[r.rating]++;
          }
        }

        const avgRating =
          reviews.length > 0
            ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
            : 0;

        // Comparison with other courses
        const allCourses = await prisma.subject.findMany({
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            nameAr: true,
            price: true,
            rating: true,
            _count: { select: { enrollments: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        const comparison = allCourses.map((c) => ({
          id: c.id,
          name: c.nameAr || c.name,
          enrollments: c._count.enrollments,
          price: c.price || 0,
          rating: c.rating || 0,
          isCurrent: c.id === id,
        }));

        return successResponse({
          enrollmentTrends,
          totalEnrollments,
          revenue: {
            total: revenue,
            recent30Days: recentRevenue,
            pricePerStudent: course.price || 0,
          },
          progressDistribution,
          avgProgress,
          contentPerformance,
          ratingDistribution,
          avgRating,
          reviewCount: reviews.length,
          comparison,
        });
      } catch (error) {
        logger.error("Error fetching course analytics", error);
        return handleApiError(error);
      }
    })
  );
}
