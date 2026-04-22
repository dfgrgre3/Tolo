import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from '@/lib/db';
import { gamificationService } from "@/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError, forbiddenResponse } from '@/lib/api-utils';
import { z } from "zod";
import { logger } from '@/lib/logger';

const resultSchema = z.object({
  examId: z.string().min(1, "معرف الامتحان مطلوب"),
  score: z.number().min(0, "الدرجة لا يمكن أن تكون أقل من صفر"),
  takenAt: z.string().optional(),
  teacherId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
        const skip = (page - 1) * limit;

        const [results, total] = await Promise.all([
          prisma.examResult.findMany({
            where: { userId: authUser.userId },
            include: {
              exam: {
                include: { subject: { select: { nameAr: true, name: true } } }
              }
            },
            orderBy: { takenAt: "desc" },
            take: limit,
            skip: skip
          }),
          prisma.examResult.count({ where: { userId: authUser.userId } })
        ]);

        return successResponse({
          results,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        });
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}

export async function POST(req: NextRequest) {
  return opsWrapper(req, async (request) => {
    return withAuth(request, async (authUser) => {
      try {
        const body = await request.json();
        const validation = resultSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const { examId, score, takenAt, teacherId } = validation.data;

        const exam = await prisma.exam.findUnique({
          where: { id: examId },
          include: { subject: true }
        });

        if (!exam) {
          return badRequestResponse("الامتحان غير موجود");
        }

        const enrollment = await prisma.subjectEnrollment.findUnique({
          where: {
            userId_subjectId: {
              userId: authUser.userId,
              subjectId: exam.subjectId
            }
          }
        });

        if (!enrollment) {
          return forbiddenResponse("يجب الاشتراك في المادة أولاً لتسجيل نتيجة الامتحان");
        }

        let result;
        try {
          result = await prisma.examResult.create({
            data: {
              userId: authUser.userId,
              examId,
              score,
              takenAt: takenAt ? new Date(takenAt) : new Date(),
              teacherId
            },
            include: {
              exam: true
            }
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return badRequestResponse("لقد قمت بتسجيل نتيجة هذا الامتحان مسبقاً");
          }
          throw error;
        }

        try {
          await gamificationService.updateUserProgress(authUser.userId, 'exam_completed', { score });
        } catch (gamificationError) {
          logger.error('Gamification update failed:', gamificationError);
        }

        return successResponse(result, "تم حفظ نتيجة الامتحان بنجاح", 201);
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}
