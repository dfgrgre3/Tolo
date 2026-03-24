import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const userId = authUser.userId;

        // Get student's enrolled subjects
        const enrollments = await prisma.subjectEnrollment.findMany({
          where: { userId },
          include: {
            subject: {
              include: {
                topics: {
                  include: {
                    subTopics: {
                      select: { id: true }
                    }
                  }
                }
              }
            }
          }
        });

        const summary = enrollments.map((enr: any) => {
          const subTopics = enr.subject.topics.flatMap((t: any) => t.subTopics);
          const totalSubTopics = subTopics.length;

          return {
            subjectId: enr.subjectId,
            subjectName: enr.subject.nameAr || enr.subject.name,
            totalSubTopics,
            completedSubTopics: 0, // Placeholder
            progress: 0,
            topics: enr.subject.topics.map((t: any) => ({
              id: t.id,
              name: t.name,
              total: t.subTopics.length,
              completed: 0 // Placeholder
            }))
          };
        });

        // Get all completed subtopics for this user
        const completed = await prisma.topicProgress.findMany({
          where: { userId, completed: true },
          select: { subTopicId: true }
        });

        const completedIds = new Set(completed.map((c: any) => c.subTopicId));

        // Fill in real numbers
        summary.forEach((sub: any) => {
          sub.topics.forEach((topic: any) => {
             // In a real implementation we would check which of topic's subtopics are in completedIds
          });
        });

        // Actually calculating numbers
        const calculatedSummary = summary.map((sub: any) => {
          const subjectTopics = enrollments.find((e: any) => e.subjectId === sub.subjectId)?.subject.topics || [];
          let totalCompleted = 0;

          const topicsProgress = subjectTopics.map((t: any) => {
            const topicCompletedCount = t.subTopics.filter((st: any) => completedIds.has(st.id)).length;
            totalCompleted += topicCompletedCount;
            return {
              id: t.id,
              name: t.name,
              total: t.subTopics.length,
              completed: topicCompletedCount,
              progress: t.subTopics.length > 0 ? (topicCompletedCount / t.subTopics.length) * 100 : 0
            };
          });

          return {
            ...sub,
            completedSubTopics: totalCompleted,
            progress: sub.totalSubTopics > 0 ? (totalCompleted / sub.totalSubTopics) * 100 : 0,
            topics: topicsProgress
          };
        });

        return successResponse(calculatedSummary);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
