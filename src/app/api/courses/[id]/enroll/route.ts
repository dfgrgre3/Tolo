import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { SubscriptionService } from '@/services/subscription-service';
import { handleCourseEnrollment } from '@/lib/courses/course-integration-service';

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

        const subject = await prisma.subject.findUnique({
          where: { id },
          select: { price: true, nameAr: true, name: true }
        });

        if (!subject) {
          return notFoundResponse("الدورة غير موجودة");
        }

        const activeSub = await SubscriptionService.checkActiveSubscription(userId);

        // If course is paid and user has no active subscription, do not enroll automatically
        if (subject.price && subject.price > 0 && !activeSub) {
          return NextResponse.json({
            requiresPayment: true,
            message: "هذه الدورة مدفوعة، يرجى إتمام عملية الدفع أو الاشتراك في باقة الأسابيع السحرية",
            price: subject.price
          });
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

        // Integrate with gamification, notifications, and update counters
        const integrationResult = await handleCourseEnrollment(userId, id);

        return successResponse({
          ...enrollment,
          xpAwarded: integrationResult.xpAwarded,
          isFirstCourse: integrationResult.isFirstCourse,
        });
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
