import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { gamificationService } from "@/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { z } from "zod";

import { logger } from '@/lib/logger';

const gradeSubmitSchema = z.object({
  examId: z.string().min(1, "معرف الامتحان مطلوب"),
  score: z.number().min(0, "الدرجة لا يمكن أن تكون أقل من صفر"),
  teacherId: z.string().optional(),
  isOnline: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const userId = authUser.userId;
        // Get all exams taken by user
        const userExams = await prisma.examResult.findMany({
          where: { userId },
          include: {
            exam: {
              include: { subject: { select: { nameAr: true, name: true } } }
            }
          },
          orderBy: {
            takenAt: 'desc'
          }
        });

        // Get all registered grades for user
        const userGrades = await prisma.userGrade.findMany({
          where: { userId },
          include: {
            subject: { select: { nameAr: true, name: true, color: true } }
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
        return handleApiError(error);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const userId = authUser.userId;
        const body = await req.json();
        const validation = gradeSubmitSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const { examId, score, teacherId, notes } = validation.data;

        // Check if exam exists
        const exam = await prisma.exam.findUnique({
          where: { id: examId }
        });

        if (!exam) {
          return notFoundResponse("الامتحان غير موجود");
        }

        // Create exam result
        const examResult = await prisma.examResult.create({
          data: {
            userId,
            examId,
            score,
            takenAt: new Date(),
            teacherId: teacherId || null
          }
        });

        // If notes or teacher result, also save as a general grade
        if (notes || teacherId) {
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
          logger.error('Gamification update failed:', gamificationError);
        }

        return successResponse({
          success: true,
          examResult
        }, "تم حفظ الدرجة بنجاح", 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

