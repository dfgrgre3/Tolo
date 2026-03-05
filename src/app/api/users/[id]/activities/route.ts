import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from "@/lib/logger";
import { createErrorResponse, handleApiError, successResponse, withAuth } from "@/lib/api-utils";
import { TaskStatus } from "@/lib/constants";

type ActivityType = "task" | "course" | "exam" | "forum" | "achievement";

type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  xp?: number;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const { id } = await params;

        if (authUser.userId !== id) {
          return createErrorResponse("Access denied", 403);
        }

        const [tasks, enrollments, examResults, forumPosts, earnedAchievements] = await Promise.all([
          prisma.task.findMany({
            where: { userId: id, status: TaskStatus.COMPLETED },
            orderBy: { completedAt: "desc" },
            take: 8,
            select: {
              id: true,
              title: true,
              description: true,
              completedAt: true,
            },
          }),
          prisma.subjectEnrollment.findMany({
            where: { userId: id },
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
              id: true,
              createdAt: true,
              subject: {
                select: {
                  name: true,
                  nameAr: true,
                },
              },
            },
          }),
          prisma.examResult.findMany({
            where: { userId: id },
            orderBy: { takenAt: "desc" },
            take: 8,
            select: {
              id: true,
              score: true,
              takenAt: true,
              exam: {
                select: {
                  title: true,
                },
              },
            },
          }),
          prisma.forumPost.findMany({
            where: { authorId: id },
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
              id: true,
              title: true,
              createdAt: true,
            },
          }),
          prisma.userAchievement.findMany({
            where: { userId: id },
            orderBy: { earnedAt: "desc" },
            take: 8,
            include: {
              achievement: {
                select: {
                  title: true,
                  description: true,
                  xpReward: true,
                },
              },
            },
          }),
        ]);

        const activity: ActivityItem[] = [
          ...tasks
            .filter((task) => task.completedAt)
            .map((task) => ({
              id: `task-${task.id}`,
              type: "task" as const,
              title: `Completed task: ${task.title}`,
              description: task.description || "Task marked as completed.",
              timestamp: (task.completedAt || new Date()).toISOString(),
            })),
          ...enrollments.map((enrollment) => ({
            id: `course-${enrollment.id}`,
            type: "course" as const,
            title: `Enrolled in subject: ${enrollment.subject.nameAr || enrollment.subject.name}`,
            description: "A new subject was added to your study plan.",
            timestamp: enrollment.createdAt.toISOString(),
          })),
          ...examResults.map((result) => ({
            id: `exam-${result.id}`,
            type: "exam" as const,
            title: `Exam result: ${result.exam.title}`,
            description: `Score: ${Math.round(result.score)}%.`,
            timestamp: result.takenAt.toISOString(),
            xp: Math.max(5, Math.round(result.score / 10)),
          })),
          ...forumPosts.map((post) => ({
            id: `forum-${post.id}`,
            type: "forum" as const,
            title: `New forum post: ${post.title}`,
            description: "You published a new post in the forum.",
            timestamp: post.createdAt.toISOString(),
          })),
          ...earnedAchievements.map((item) => ({
            id: `achievement-${item.id}`,
            type: "achievement" as const,
            title: `New achievement: ${item.achievement.title}`,
            description: item.achievement.description,
            timestamp: item.earnedAt.toISOString(),
            xp: item.achievement.xpReward,
          })),
        ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 20);

        return successResponse(activity);
      } catch (error) {
        logger.error("Error fetching user activities:", error);
        return handleApiError(error);
      }
    });
  });
}
