import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { gamificationService } from "@/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from '@/lib/api-utils';
import { z } from "zod";

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
        const results = await prisma.examResult.findMany({
          where: { userId: authUser.userId },
          include: {
            exam: {
              include: { subject: { select: { nameAr: true, name: true } } }
            }
          },
          orderBy: { takenAt: "desc" }
        });
        return successResponse(results);
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
        const result = await prisma.examResult.create({
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

        // Trigger gamification for exam completion
        try {
          await gamificationService.updateUserProgress(authUser.userId, 'exam_completed', { score });
        } catch (gamificationError) {
          // Log but don't fail the request
          console.error('Gamification update failed:', gamificationError);
        }

        return successResponse(result, "تم حفظ نتيجة الامتحان بنجاح", 201);
      } catch (e: unknown) {
        return handleApiError(e);
      }
    });
  });
}
