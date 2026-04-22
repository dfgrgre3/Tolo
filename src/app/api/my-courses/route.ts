import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, handleApiError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { mapSubjectToCourse, getSubjectLessonCounts } from "@/lib/courses/course-service";

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { searchParams } = new URL(req.url);
        const filter = searchParams.get("filter") || "all"; // all, in-progress, completed

        // Get user's enrolled courses
        const enrollments = await prisma.subjectEnrollment.findMany({
          where: {
            userId,
            isDeleted: false,
          },
          include: {
            subject: {
              include: {
                teachers: {
                  select: { name: true, rating: true },
                  orderBy: { rating: "desc" },
                },
                _count: { select: { enrollments: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        });

        if (enrollments.length === 0) {
          return successResponse({
            courses: [],
            stats: {
              total: 0,
              inProgress: 0,
              completed: 0,
              totalStudyTime: 0,
              certificates: 0,
            },
          });
        }

        const subjectIds = enrollments.map((e: any) => e.subjectId);

        // Get lesson counts, certificates, and progress in parallel
        const [lessonCounts, certificates, progressData] = await Promise.all([
          getSubjectLessonCounts(subjectIds),
          prisma.subjectCertificate.findMany({
            where: { userId, subjectId: { in: subjectIds } },
            select: { id: true, subjectId: true, certUrl: true, issuedAt: true },
          }),
          // Get completed lessons per subject
          prisma.topicProgress.findMany({
            where: {
              userId,
              completed: true,
              subTopic: {
                topic: { subjectId: { in: subjectIds } },
              },
            },
            select: {
              subTopic: {
                select: {
                  topic: { select: { subjectId: true } },
                },
              },
            },
          }),
        ]);

        // Build completed per subject map
        const completedBySubject = new Map<string, number>();
        for (const p of progressData) {
          const sid = p.subTopic.topic.subjectId;
          completedBySubject.set(sid, (completedBySubject.get(sid) ?? 0) + 1);
        }

        // Build certificate map
        const certMap = new Map<string, any>(
          certificates.map((c: any) => [c.subjectId, c])
        );

        // Map enrollment courses
        const courses = enrollments.map((enrollment: any) => {
          const course = mapSubjectToCourse(enrollment.subject as any, {
            lessonsCount: lessonCounts[enrollment.subjectId] ?? 0,
            enrolled: true,
            progress: enrollment.progress ?? 0,
          });

          const totalLessons = lessonCounts[enrollment.subjectId] ?? 0;
          const completedLessons = completedBySubject.get(enrollment.subjectId) ?? 0;
          const realProgress = totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

          const cert = certMap.get(enrollment.subjectId);

          return {
            ...course,
            enrolledAt: enrollment.createdAt,
            lastAccessedAt: enrollment.updatedAt,
            progress: realProgress,
            completedLessons,
            totalLessons,
            certificate: cert
              ? {
                id: cert.id as string,
                url: cert.certUrl as string,
                issuedAt: cert.issuedAt as Date,
              }
              : null,
          };
        });

        // Apply filter
        let filteredCourses = courses;
        if (filter === "in-progress") {
          filteredCourses = courses.filter(
            (c: any) => (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100
          );
        } else if (filter === "completed") {
          filteredCourses = courses.filter((c: any) => (c.progress ?? 0) >= 100);
        }

        // Calculate stats
        const stats = {
          total: courses.length,
          inProgress: courses.filter(
            (c: any) => (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100
          ).length,
          completed: courses.filter((c: any) => (c.progress ?? 0) >= 100).length,
          notStarted: courses.filter((c: any) => (c.progress ?? 0) === 0).length,
          certificates: certificates.length,
          totalCompletedLessons: courses.reduce(
            (sum: number, c: any) => sum + c.completedLessons,
            0
          ),
          totalLessons: courses.reduce((sum: number, c: any) => sum + (c.totalLessons || 0), 0),
        };

        return successResponse({
          courses: filteredCourses,
          stats,
        });
      } catch (error) {
        logger.error("Error fetching my courses:", error);
        return handleApiError(error);
      }
    });
  });
}
