import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { OpenAI } from 'openai';
import { rateLimit, withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// Initialize OpenAI client lazily/conditionally to avoid build errors
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface TestAnswer {
  questionId: string;
  value: string;
}

interface TestEvaluationRequest {
  testId: string;
  answers: TestAnswer[];
  timeSpent: number;
}

interface AIQuestion {
  id: string;
  question: string;
  options: any;
  correctAnswer: string;
  explanation: string | null;
  points: number;
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(req, 20, 'evaluate_test'); // 20 requests per window
        if (rateLimitResult) {
          return rateLimitResult;
        }

        const body = (await req.json()) as TestEvaluationRequest;
        const { testId, answers, timeSpent } = body;

        if (!testId || !answers) {
          return badRequestResponse('Test ID and answers are required');
        }

        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return notFoundResponse('User not found');
        }

        // Get test with questions from database
        const test = await prisma.aiGeneratedExam.findUnique({
          where: { id: testId },
          include: { questions: true }
        });

        if (!test) {
          return notFoundResponse('Test not found');
        }

        // Prepare answers and questions for AI evaluation
        const questionsForEvaluation = test.questions.map((q): AIQuestion => ({
          id: q.id,
          question: q.question,
          options: q.options && typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points
        }));

        const userAnswersForEvaluation = answers.map((a: TestAnswer) => ({
          questionId: a.questionId,
          value: a.value
        }));

        // Create prompt for AI to evaluate answers
        const prompt = `
        قم بتقييم إجابات الطالب على الاختبار التالي في مادة ${getSubjectName(test.subjectId)}.

        الأسئلة والإجابات الصحيحة:
        ${JSON.stringify(questionsForEvaluation, null, 2)}

        إجابات الطالب:
        ${JSON.stringify(userAnswersForEvaluation, null, 2)}

        قم بتقييم كل إجابة وتحديد ما إذا كانت صحيحة أم خاطئة، مع تقديم شرح موجز لكل إجابة.

        بعد ذلك، قم بتقديم ملخص شامل للتقييم يتضمن:
        1. الدرجة الإجمالية والنسبة المئوية
        2. عدد الإجابات الصحيحة والخاطئة
        3. نقاط القوة في إجابات الطالب
        4. جوانب تحتاج إلى تحسين
        5. توصيات للطالب لتحسين أدائه

        قم بتنسيق الإجابة كـ JSON بالهيكل التالي:
        {
          "detailedResults": [
            {
              "questionId": "معرف السؤال",
              "isCorrect": true,
              "userAnswer": "إجابة الطالب",
              "correctAnswer": "الإجابة الصحيحة",
              "explanation": "شرح للتقييم",
              "feedback": "ملاحظات على الإجابة"
            }
          ],
          "summary": {
            "score": 85,
            "totalPoints": 100,
            "correctAnswers": 8,
            "incorrectAnswers": 2,
            "strengths": [
              "فهمك للمفاهيم الأساسية جيد"
            ],
            "improvementAreas": [
              "تحتاج إلى تحسين معرفتك بالمفاهيم المتقدمة"
            ],
            "recommendations": [
              "راجع الفصول من 5 إلى 7 في الكتاب المقرر"
            ]
          }
        }
      `;

        // Call OpenAI API to evaluate answers
        if (!openai) {
          throw new Error("OpenAI API key is not configured");
        }

        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });

        const responseContent = completion.choices[0].message.content;
        if (!responseContent) {
          throw new Error("Empty response from AI");
        }

        const evaluation = JSON.parse(responseContent);

        // Calculate score
        let score = 0;
        let totalPoints = 0;

        test.questions.forEach((question) => {
          totalPoints += question.points;
          const result = evaluation.detailedResults.find((r: { questionId: string; isCorrect: boolean }) => r.questionId === question.id);
          if (result && result.isCorrect) {
            score += question.points;
          }
        });

        // Save test result to database
        await prisma.testResult.create({
          data: {
            userId: user.id,
            examId: testId,
            score,
            totalScore: totalPoints,
            timeTaken: timeSpent,
            answers: JSON.stringify(answers)
          }
        });

        // Return the evaluation result
        return successResponse({
          result: {
            testId,
            answers,
            score,
            totalPoints,
            timeSpent,
            completedAt: new Date(),
            feedback: evaluation.summary,
            detailedResults: evaluation.detailedResults
          }
        });
      } catch (error: unknown) {
        logger.error('Error evaluating test:', error);
        return handleApiError(error);
      }
    });
  });
}

function getSubjectName(subjectValue: string): string {
  const subjects: Record<string, string> = {
    'MATH': 'الرياضيات',
    'SCIENCE': 'العلوم',
    'HISTORY': 'التاريخ',
    'ARABIC': 'اللغة العربية',
    'ENGLISH': 'اللغة الإنجليزية',
    'PHYSICS': 'الفيزياء',
    'CHEMISTRY': 'الكيمياء',
    'BIOLOGY': 'الأحياء',
    'COMPUTER': 'علوم الحاسب',
  };

  return subjects[subjectValue] || subjectValue;
}
