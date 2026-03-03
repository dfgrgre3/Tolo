import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { gamificationService } from "@/lib/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        // الحصول على جميع الامتحانات التي أخذها المستخدم
        const userExams = await prisma.examResult.findMany({
          where: { userId },
          include: {
            exam: true
          },
          orderBy: {
            takenAt: 'desc'
          }
        });

        // الحصول على جميع الدرجات المسجلة للمستخدم
        const userGrades = await prisma.userGrade.findMany({
          where: { userId },
          include: {
            subject: true
          },
          orderBy: {
            date: 'desc'
          }
        });

        return successResponse({
          exams: userExams,
          grades: userGrades
        });
      } catch (error) {
        logger.error("Error fetching exam grades:", error);
        return handleApiError(error);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const { examId, score, teacherId, isOnline, notes } = await req.json();

        if (!examId || score === undefined) {
          return badRequestResponse("البيانات المطلوبة غير مكتملة");
        }

        // التحقق من وجود الامتحان
        const exam = await prisma.exam.findUnique({
          where: { id: examId }
        });

        if (!exam) {
          return notFoundResponse("الامتحان غير موجود");
        }

        // تسجيل نتيجة الامتحان
        const examResult = await prisma.examResult.create({
          data: {
            userId,
            examId,
            score,
            takenAt: new Date(),
            teacherId: teacherId || null
          }
        });

        // إذا كانت هناك ملاحظات، قم بحفظها كدرجة منفصلة
        if (notes) {
          await prisma.userGrade.create({
            data: {
              userId,
              subjectId: exam.subjectId,
              grade: score,
              maxGrade: 100,
              date: new Date()
            }
          });
        }

        // Trigger gamification for exam completion
        try {
          await gamificationService.updateUserProgress(userId, 'exam_completed', { score });
        } catch (gamificationError) {
          logger.error('Error updating gamification for exam:', gamificationError);
          // Don't fail the request if gamification fails
        }

        return successResponse({
          success: true,
          examResult
        });
      } catch (error) {
        logger.error("Error saving exam grade:", error);
        return handleApiError(error);
      }
    });
  });
}
