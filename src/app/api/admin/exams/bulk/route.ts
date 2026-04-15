import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse } from '@/lib/api-utils';
import { z } from "zod";
import { Prisma } from "@prisma/client";


const questionSchema = z.object({
  question: z.string().min(1, "ط§ظ„ط³ط¤ط§ظ„ ظ…ط·ظ„ظˆط¨"),
  options: z.array(z.string()).min(2, "ظٹط¬ط¨ ظˆط¬ظˆط¯ ط®ظٹط§ط±ظٹظ† ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„"),
  correctAnswer: z.string().min(1, "ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط© ظ…ط·ظ„ظˆط¨ط©"),
  explanation: z.string().optional(),
  points: z.number().default(1),
  order: z.number().optional(),
});

const bulkExamSchema = z.object({
  title: z.string().min(1, "ط¹ظ†ظˆط§ظ† ط§ظ„ط§ظ…طھط­ط§ظ† ظ…ط·ظ„ظˆط¨"),
  subjectId: z.string().min(1, "ظ…ط¹ط±ظپ ط§ظ„ظ…ط§ط¯ط© ظ…ط·ظ„ظˆط¨"),
  duration: z.number().default(60),
  year: z.number().default(new Date().getFullYear()),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).default("MEDIUM"),
  questions: z.array(questionSchema).min(1, "ظٹط¬ط¨ ظˆط¬ظˆط¯ ط³ط¤ط§ظ„ ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„"),
});

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("ط؛ظٹط± ظ…ط³ظ…ظˆط­ ظ„ظƒ ط¨ط±ظپط¹ ط§ظ…طھط­ط§ظ†ط§طھ ط¬ظ…ط§ط¹ظٹط©");
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
              userId: authUser.userId,
            },
          });

          const questionsData = questions.map((q, index) => ({
            examId: exam.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "",
            points: q.points,
            order: q.order ?? index,
          }));

          await tx.aiQuestion.createMany({
            data: questionsData,
          });

          return exam;
        });

        return successResponse(result, `طھظ… ط±ظپط¹ ${questions.length} ط³ط¤ط§ظ„ ط¨ظ†ط¬ط§ط­ ظˆطھظƒظˆظٹظ† ط§ظ„ط§ط®طھط¨ط§ط± ط§ظ„ظ…ظ„ظƒظٹ.`, 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}


