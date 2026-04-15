import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

import { OpenAI } from 'openai';
import { rateLimit, withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface TestGenerationRequest {
  subject: string;
  difficulty?: string;
  questionCount?: number;
  questionTypes: string[];
  timeLimit?: number;
  lesson?: string;
}

interface AIQuestionInput {
  question: string;
  type: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points?: number;
}

interface AIGeneratedTest {
  title: string;
  questions: AIQuestionInput[];
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        // Apply rate limiting
        const rateLimitResult = await rateLimit(req, 10, 'generate_test'); // 10 requests per window
        if (rateLimitResult) {
          return rateLimitResult;
        }

        const body = (await req.json()) as TestGenerationRequest;
        const { subject, difficulty, questionCount, questionTypes, timeLimit, lesson } = body;

        if (!subject) {
          return badRequestResponse('Subject is required');
        }

        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          return notFoundResponse('User not found');
        }

        // Create prompt for AI to generate test
        const prompt = `
      ظ‚ظ… ط¨ط¥ظ†ط´ط§ط، ط§ط®طھط¨ط§ط± ظپظٹ ظ…ط§ط¯ط© ${getSubjectName(subject)}${lesson ? ` ط­ظˆظ„ ظ…ظˆط¶ظˆط¹ ${lesson}` : ''}.

      ط§ظ„طھظپط§طµظٹظ„:
      - ط¹ط¯ط¯ ط§ظ„ط£ط³ط¦ظ„ط©: ${questionCount || 10}
      - ظ…ط³طھظˆظ‰ ط§ظ„طµط¹ظˆط¨ط©: ${getDifficultyName(difficulty || 'medium')}
      - ط£ظ†ظˆط§ط¹ ط§ظ„ط£ط³ط¦ظ„ط©: ${questionTypes.map((t: string) => getQuestionTypeName(t)).join(', ')}
      - ط§ظ„ظ…ط¯ط© ط§ظ„ط²ظ…ظ†ظٹط©: ${timeLimit || 30} ط¯ظ‚ظٹظ‚ط©

      ظ„ظƒظ„ ط³ط¤ط§ظ„طŒ ظ‚ظ… ط¨طھظˆظپظٹط±:
      1. ظ†طµ ط§ظ„ط³ط¤ط§ظ„
      2. ظ†ظˆط¹ ط§ظ„ط³ط¤ط§ظ„
      3. ط§ظ„ط®ظٹط§ط±ط§طھ (ط¥ط°ط§ ظƒط§ظ† ط³ط¤ط§ظ„ ط§ط®طھظٹط§ط± ظ…ظ† ظ…طھط¹ط¯ط¯)
      4. ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©
      5. ط´ط±ط­ ظ„ظ„ط¥ط¬ط§ط¨ط© (ط¨ط­ط¯ ط£ظ‚طµظ‰ 50 ظƒظ„ظ…ط©)
      6. ظ…ط³طھظˆظ‰ ط§ظ„طµط¹ظˆط¨ط© (ط³ظ‡ظ„طŒ ظ…طھظˆط³ط·طŒ طµط¹ط¨)
      7. ظ†ظ‚ط§ط· ط§ظ„ط³ط¤ط§ظ„ (1 ظ„ظ„ط³ظ‡ظ„طŒ 2 ظ„ظ„ظ…طھظˆط³ط·طŒ 3 ظ„ظ„طµط¹ط¨)

      ظ‚ظ… ط¨طھظ†ط³ظٹظ‚ ط§ظ„ط¥ط¬ط§ط¨ط© ظƒظ€ JSON ط¨ط§ظ„ظ‡ظٹظƒظ„ ط§ظ„طھط§ظ„ظٹ:
      {
        "title": "ط¹ظ†ظˆط§ظ† ط§ظ„ط§ط®طھط¨ط§ط±",
        "questions": [
          {
            "question": "ظ†طµ ط§ظ„ط³ط¤ط§ظ„",
            "type": "ظ†ظˆط¹ ط§ظ„ط³ط¤ط§ظ„",
            "options": ["ط®ظٹط§ط±1", "ط®ظٹط§ط±2", "ط®ظٹط§ط±3", "ط®ظٹط§ط±4"],
            "correctAnswer": "ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©",
            "explanation": "ط´ط±ط­ ظ„ظ„ط¥ط¬ط§ط¨ط©",
            "difficulty": "ظ…ط³طھظˆظ‰ ط§ظ„طµط¹ظˆط¨ط©",
            "points": 1
          }
        ]
      }
    `;

        // Call OpenAI API to generate test
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });

        const responseContent = completion.choices[0].message.content;
        if (!responseContent) {
          throw new Error("Empty response from AI");
        }

        const generatedTest = JSON.parse(responseContent) as AIGeneratedTest;

        // Look up subject in database
        const dbSubject = await prisma.subject.findFirst({
          where: {
            OR: [
              { name: { equals: subject, mode: 'insensitive' } },
              { nameAr: { equals: subject, mode: 'insensitive' } }
            ]
          }
        });

        if (!dbSubject) {
          return notFoundResponse(`Subject ${subject} not found`);
        }

        // Create exam in database
        const newExam = await prisma.aiGeneratedExam.create({
          data: {
            userId: user.id,
            subjectId: dbSubject.id,
            title: String(generatedTest.title || `ط§ط®طھط¨ط§ط± ${subject}`),
            year: new Date().getFullYear(),
            difficulty: (difficulty || 'MEDIUM').toUpperCase() as any,
            duration: Number(timeLimit || 30),
          }
        });

        // Create questions in database
        for (const q of generatedTest.questions) {
          await prisma.aiQuestion.create({
            data: {
              examId: newExam.id,
              question: q.question,
              options: Array.isArray(q.options) ? q.options : [],
              correctAnswer: String(q.correctAnswer),
              explanation: q.explanation || null,
              points: Number(q.points || 1),
            }
          });
        }

        // Return the created exam with questions
        const examWithQuestions = await prisma.aiGeneratedExam.findUnique({
          where: { id: newExam.id },
          include: { questions: true }
        });

        return successResponse({ test: examWithQuestions });
      } catch (error: unknown) {
        logger.error('Error generating test:', error);
        return handleApiError(error);
      }
    });
  });
}

function getSubjectName(subjectValue: string): string {
  const subjects: Record<string, string> = {
    'math': 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ',
    'science': 'ط§ظ„ط¹ظ„ظˆظ…',
    'history': 'ط§ظ„طھط§ط±ظٹط®',
    'arabic': 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¹ط±ط¨ظٹط©',
    'english': 'ط§ظ„ظ„ط؛ط© ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©',
    'physics': 'ط§ظ„ظپظٹط²ظٹط§ط،',
    'chemistry': 'ط§ظ„ظƒظٹظ…ظٹط§ط،',
    'biology': 'ط§ظ„ط£ط­ظٹط§ط،',
    'computer': 'ط¹ظ„ظˆظ… ط§ظ„ط­ط§ط³ط¨',
  };

  return subjects[subjectValue] || subjectValue;
}

function getDifficultyName(difficulty: string): string {
  const difficulties: Record<string, string> = {
    'easy': 'ط³ظ‡ظ„',
    'medium': 'ظ…طھظˆط³ط·',
    'hard': 'طµط¹ط¨',
    'mixed': 'ظ…ط®طھظ„ط·',
  };

  return difficulties[difficulty] || difficulty;
}

function getQuestionTypeName(type: string): string {
  const types: Record<string, string> = {
    'multiple-choice': 'ط§ط®طھظٹط§ط± ظ…ظ† ظ…طھط¹ط¯ط¯',
    'true-false': 'طµط­/ط®ط·ط£',
    'short-answer': 'ط¥ط¬ط§ط¨ط© ظ‚طµظٹط±ط©',
    'essay': 'ظ…ظ‚ط§ظ„',
  };

  return types[type] || type;
}

