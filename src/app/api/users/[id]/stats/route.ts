import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authService } from "@/lib/services/auth-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import { TASK_STATUS } from '@/lib/constants';

// Type for Prisma client with optional models
type PrismaClientWithOptionalModels = typeof prisma & {
  forumPost?: { count: (args: { where: { authorId: string } }) => Promise<number> };
  blogPost?: { count: (args: { where: { authorId: string } }) => Promise<number> };
};

// GET user stats by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      const { id } = await params;

      // Authenticate user and ensure they can only access their own stats
      const verification = await authService.verifyTokenFromRequest(req, { checkSession: true });
      if (!verification.isValid || !verification.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const authUser = verification.user;

      if (authUser.userId !== id) {
        return NextResponse.json({ error: "Forbidden: Can only access your own stats" }, { status: 403 });
      }

      // Get completed tasks count
      const completedTasks = await prisma.task.count({
        where: {
          userId: id,
          status: TASK_STATUS.COMPLETED
        }
      });

      // Get total study time in minutes
      const studySessions = await prisma.studySession.findMany({
        where: {
          userId: id
        },
        select: {
          durationMin: true
        }
      });

      type StudySessionDuration = Pick<Prisma.StudySessionGetPayload<{}>, 'durationMin'>;
      const totalStudyTime = studySessions.reduce((total: number, session: StudySessionDuration) => total + (session.durationMin || 0), 0);

      // Get courses enrolled count (using SubjectEnrollment)
      let coursesEnrolled = 0;
      try {
        coursesEnrolled = await prisma.subjectEnrollment.count({
          where: {
            userId: id
          }
        });
      } catch (error) {
        logger.warn("Error fetching subject enrollments:", error);
      }

      // Get exams taken count
      const examsTaken = await prisma.examResult.count({
        where: {
          userId: id
        }
      });

      // Get forum posts count (if model exists)
      // Note: forumPost model may not exist in schema
      let forumPosts = 0;
      try {
        // Type assertion for optional model
        const prismaClient = prisma as PrismaClientWithOptionalModels;
        if ('forumPost' in prismaClient && typeof prismaClient.forumPost === 'object') {
          forumPosts = await (prismaClient.forumPost as { count: (args: { where: { authorId: string } }) => Promise<number> }).count({
            where: {
              authorId: id
            }
          });
        }
      } catch (error: unknown) {
        // Model doesn't exist in schema or other error, return 0
        const prismaError = error as { code?: string; message?: string };
        if (prismaError?.code === 'P2001' || prismaError?.message?.includes('does not exist')) {
          logger.debug("ForumPost model not available in schema");
        } else {
          logger.warn("Error fetching forum posts count:", error);
        }
      }

      // Get blog posts count (if model exists)
      // Note: blogPost model may not exist in schema
      let blogPosts = 0;
      try {
        // Type assertion for optional model
        const prismaClient = prisma as PrismaClientWithOptionalModels;
        if ('blogPost' in prismaClient && typeof prismaClient.blogPost === 'object') {
          blogPosts = await (prismaClient.blogPost as { count: (args: { where: { authorId: string } }) => Promise<number> }).count({
            where: {
              authorId: id
            }
          });
        }
      } catch (error: unknown) {
        // Model doesn't exist in schema or other error, return 0
        const prismaError = error as { code?: string; message?: string };
        if (prismaError?.code === 'P2001' || prismaError?.message?.includes('does not exist')) {
          logger.debug("BlogPost model not available in schema");
        } else {
          logger.warn("Error fetching blog posts count:", error);
        }
      }

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
      logger.error("Error fetching user stats:", error);
      return NextResponse.json(
        { error: "حدث خطأ في جلب إحصائيات المستخدم" },
        { status: 500 }
      );
    }
  });
}
