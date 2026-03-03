import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// POST to enroll in a subject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { id } = await params;

        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return notFoundResponse("المستخدم غير موجود");
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.subjectEnrollment.findFirst({
          where: {
            userId,
            subjectId: id
          }
        });

        if (existingEnrollment) {
          return badRequestResponse("المستخدم مسجل بالفعل في هذه المادة");
        }

        // Create enrollment
        const enrollment = await prisma.subjectEnrollment.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            subjectId: id,
            targetWeeklyHours: 0 // Default value, can be updated later
          }
        });

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
        const { id } = await params; // This would be the subject

        const enrollment = await prisma.subjectEnrollment.findFirst({
          where: {
            userId,
            subjectId: id
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
        const { id } = await params; // This would be the subject

        // Check if enrollment exists
        const enrollment = await prisma.subjectEnrollment.findFirst({
          where: {
            userId,
            subjectId: id
          }
        });

        if (!enrollment) {
          return notFoundResponse("التسجيل غير موجود");
        }

        // Delete enrollment
        await prisma.subjectEnrollment.delete({
          where: {
            id: enrollment.id
          }
        });

        return successResponse({ message: "تم إلغاء التسجيل بنجاح" });
      } catch (error) {
        logger.error("Error unenrolling from course:", error);
        return handleApiError(error);
      }
    });
  });
}
