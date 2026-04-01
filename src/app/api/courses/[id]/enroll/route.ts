import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// POST to enroll in a subject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params;

        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return notFoundResponse("المستخدم غير موجود");
        }

        let enrollment;
        try {
          enrollment = await prisma.subjectEnrollment.create({
            data: {
              userId,
              subjectId: id,
              targetWeeklyHours: 0
            }
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return badRequestResponse("المستخدم مسجل بالفعل في هذه المادة");
          }
          throw error;
        }

        return successResponse(enrollment);
      } catch (error) {
        logger.error("Error enrolling in course:", error);
        return handleApiError(error);
      }
    });
  });
}

// GET to check enrollment status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params;

        const enrollment = await prisma.subjectEnrollment.findUnique({
          where: {
            userId_subjectId: {
              userId,
              subjectId: id
            }
          }
        });

        if (!enrollment) {
          return successResponse({ enrolled: false });
        }

        return successResponse({
          enrolled: true,
          enrollment
        });
      } catch (error) {
        logger.error("Error checking enrollment status:", error);
        return handleApiError(error);
      }
    });
  });
}

// DELETE to unenroll from a subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params;

        try {
          await prisma.subjectEnrollment.delete({
            where: {
              userId_subjectId: {
                userId,
                subjectId: id
              }
            }
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return notFoundResponse("التسجيل غير موجود");
          }
          throw error;
        }

        return successResponse({ message: "تم إلغاء التسجيل بنجاح" });
      } catch (error) {
        logger.error("Error unenrolling from course:", error);
        return handleApiError(error);
      }
    });
  });
}
