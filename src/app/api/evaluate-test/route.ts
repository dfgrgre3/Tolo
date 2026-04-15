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
        const rateLimitResult = await rateLimit(req, 20); // 20 requests per window
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
        const questionsForEvaluation = test.questions.map((q: any): AIQuestion => ({
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
        ظ‚ظ… ط¨طھظ‚ظٹظٹظ… ط¥ط¬ط§ط¨ط§طھ ط§ظ„ط·ط§ظ„ط¨ ط¹ظ„ظ‰ ط§ظ„ط§ط®طھط¨ط§ط± ط§ظ„طھط§ظ„ظٹ ظپظٹ ظ…ط§ط¯ط© ${getSubjectName(test.subjectId)}.

        ط§ظ„ط£ط³ط¦ظ„ط© ظˆط§ظ„ط¥ط¬ط§ط¨ط§طھ ط§ظ„طµط­ظٹط­ط©:
        ${JSON.stringify(questionsForEvaluation, null, 2)}

        ط¥ط¬ط§ط¨ط§طھ ط§ظ„ط·ط§ظ„ط¨:
        ${JSON.stringify(userAnswersForEvaluation, null, 2)}

        ظ‚ظ… ط¨طھظ‚ظٹظٹظ… ظƒظ„ ط¥ط¬ط§ط¨ط© ظˆطھط­ط¯ظٹط¯ ظ…ط§ ط¥ط°ط§ ظƒط§ظ†طھ طµط­ظٹط­ط© ط£ظ… ط®ط§ط·ط¦ط©طŒ ظ…ط¹ طھظ‚ط¯ظٹظ… ط´ط±ط­ ظ…ظˆط¬ط² ظ„ظƒظ„ ط¥ط¬ط§ط¨ط©.

        ط¨ط¹ط¯ ط°ظ„ظƒطŒ ظ‚ظ… ط¨طھظ‚ط¯ظٹظ… ظ…ظ„ط®طµ ط´ط§ظ…ظ„ ظ„ظ„طھظ‚ظٹظٹظ… ظٹطھط¶ظ…ظ†:
        1. ط§ظ„ط¯ط±ط¬ط© ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط© ظˆط§ظ„ظ†ط³ط¨ط© ط§ظ„ظ…ط¦ظˆظٹط©
        2. ط¹ط¯ط¯ ط§ظ„ط¥ط¬ط§ط¨ط§طھ ط§ظ„طµط­ظٹط­ط© ظˆط§ظ„ط®ط§ط·ط¦ط©
        3. ظ†ظ‚ط§ط· ط§ظ„ظ‚ظˆط© ظپظٹ ط¥ط¬ط§ط¨ط§طھ ط§ظ„ط·ط§ظ„ط¨
        4. ط¬ظˆط§ظ†ط¨ طھط­طھط§ط¬ ط¥ظ„ظ‰ طھط­ط³ظٹظ†
        5. طھظˆطµظٹط§طھ ظ„ظ„ط·ط§ظ„ط¨ ظ„طھط­ط³ظٹظ† ط£ط¯ط§ط¦ظ‡

        ظ‚ظ… ط¨طھظ†ط³ظٹظ‚ ط§ظ„ط¥ط¬ط§ط¨ط© ظƒظ€ JSON ط¨ط§ظ„ظ‡ظٹظƒظ„ ط§ظ„طھط§ظ„ظٹ:
        {
          "detailedResults": [
            {
              "questionId": "ظ…ط¹ط±ظپ ط§ظ„ط³ط¤ط§ظ„",
              "isCorrect": true,
              "userAnswer": "ط¥ط¬ط§ط¨ط© ط§ظ„ط·ط§ظ„ط¨",
              "correctAnswer": "ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©",
              "explanation": "ط´ط±ط­ ظ„ظ„طھظ‚ظٹظٹظ…",
              "feedback": "ظ…ظ„ط§ط­ط¸ط§طھ ط¹ظ„ظ‰ ط§ظ„ط¥ط¬ط§ط¨ط©"
            }
          ],
          "summary": {
            "score": 85,
            "totalPoints": 100,
            "correctAnswers": 8,
            "incorrectAnswers": 2,
            "strengths": [
              "ظپظ‡ظ…ظƒ ظ„ظ„ظ…ظپط§ظ‡ظٹظ… ط§ظ„ط£ط³ط§ط³ظٹط© ط¬ظٹط¯"
            ],
            "improvementAreas": [
              "طھط­طھط§ط¬ ط¥ظ„ظ‰ طھط­ط³ظٹظ† ظ…ط¹ط±ظپطھظƒ ط¨ط§ظ„ظ…ظپط§ظ‡ظٹظ… ط§ظ„ظ…طھظ‚ط¯ظ…ط©"
            ],
            "recommendations": [
              "ط±ط§ط¬ط¹ ط§ظ„ظپطµظˆظ„ ظ…ظ† 5 ط¥ظ„ظ‰ 7 ظپظٹ ط§ظ„ظƒطھط§ط¨ ط§ظ„ظ…ظ‚ط±ط±"
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

        test.questions.forEach((question: any) => {
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
    'MATH': 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ',
    'SCIENCE': 'ط§ظ„ط¹ظ„ظˆظ…',
    'HISTORY': 'ط§ظ„طھط§ط±ظٹط®',
    'ARABIC': 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©',
    'ENGLISH': 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©',
    'PHYSICS': 'ط§ظ„ظپظٹط²ظٹط§ط،',
    'CHEMISTRY': 'ط§ظ„ظƒظٹظ…ظٹط§ط،',
    'BIOLOGY': 'ط§ظ„ط£ط­ظٹط§ط،',
    'COMPUTER': 'ط¹ظ„ظˆظ… ط§ظ„ط­ط§ط³ط¨',
  };

  return subjects[subjectValue] || subjectValue;
}

