import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse } from '@/lib/api-utils';
import { z } from "zod";



const questionSchema = z.object({
  question: z.string().min(1, "السؤال مطلوب"),
  options: z.array(z.string()).min(2, "يجب وجود خيارين على الأقل"),
  correctAnswer: z.string().min(1, "الإجابة الصحيحة مطلوبة"),
  explanation: z.string().optional(),
  points: z.number().default(1),
  order: z.number().optional()
});

const bulkExamSchema = z.object({
  title: z.string().min(1, "عنوان الامتحان مطلوب"),
  subjectId: z.string().min(1, "معرف المادة مطلوب"),
  duration: z.number().default(60),
  year: z.number().default(new Date().getFullYear()),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).default("MEDIUM"),
  questions: z.array(questionSchema).min(1, "يجب وجود سؤال واحد على الأقل")
});

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك برفع امتحانات جماعية");
      }

      try {
        const body = await req.json();
        const validation = bulkExamSchema.safeParse(body);

        if (!validation.success) {
          return badRequestResponse(validation.error.errors[0].message);
        }

        const { title, subjectId, duration, year, difficulty, questions } = validation.data;

        // Create the interactive exam with its questions in a transaction
        const result = await (prisma as any).$transaction(async (tx: any) => {
          const exam = await tx.aiGeneratedExam.create({

            data: {
              title,
              subjectId,
              duration,
              year,
              difficulty,
              userId: authUser.userId
            }
          });

          const questionsData = questions.map((q, index) => ({
            examId: exam.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "",
            points: q.points,
            order: q.order ?? index
          }));

          await tx.aiQuestion.createMany({
            data: questionsData
          });

          return exam;
        });

        return successResponse(result, `تم رفع ${questions.length} سؤال بنجاح وتكوين الاختبار الملكي.`, 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}