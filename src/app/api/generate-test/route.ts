import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

import { OpenAI } from 'openai';
import { rateLimit, withAuth, successResponse, badRequestResponse, notFoundResponse, handleApiError } from '@/lib/api-utils';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

        const { subject, difficulty, questionCount, questionTypes, timeLimit, lesson } = await req.json();

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
      قم بإنشاء اختبار في مادة ${getSubjectName(subject)}${lesson ? ` حول موضوع ${lesson}` : ''}.

      التفاصيل:
      - عدد الأسئلة: ${questionCount || 10}
      - مستوى الصعوبة: ${getDifficultyName(difficulty)}
      - أنواع الأسئلة: ${questionTypes.map((t: string) => getQuestionTypeName(t)).join(', ')}
      - المدة الزمنية: ${timeLimit || 30} دقيقة

      لكل سؤال، قم بتوفير:
      1. نص السؤال
      2. نوع السؤال
      3. الخيارات (إذا كان سؤال اختيار من متعدد)
      4. الإجابة الصحيحة
      5. شرح للإجابة (بحد أقصى 50 كلمة)
      6. مستوى الصعوبة (سهل، متوسط، صعب)
      7. نقاط السؤال (1 للسهل، 2 للمتوسط، 3 للصعب)

      قم بتنسيق الإجابة كـ JSON بالهيكل التالي:
      {
        "title": "عنوان الاختبار",
        "questions": [
          {
            "question": "نص السؤال",
            "type": "نوع السؤال",
            "options": ["خيار1", "خيار2", "خيار3", "خيار4"],
            "correctAnswer": "الإجابة الصحيحة",
            "explanation": "شرح للإجابة",
            "difficulty": "مستوى الصعوبة",
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

        const generatedTest = JSON.parse(responseContent);

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
            title: String(generatedTest.title || `اختبار ${subject}`),
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
              options: q.options ? q.options : Prisma.JsonNull,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: q.points || 1
            }
          });
        }

        // Return the created exam with questions
        const examWithQuestions = await prisma.aiGeneratedExam.findUnique({
          where: { id: newExam.id },
          include: { questions: true }
        });

        return successResponse({ test: examWithQuestions });
      } catch (error) {
        logger.error('Error generating test:', error);
        return handleApiError(error);
      }
    });
  });
}

function getSubjectName(subjectValue: string): string {
  const subjects: Record<string, string> = {
    'math': 'الرياضيات',
    'science': 'العلوم',
    'history': 'التاريخ',
    'arabic': 'اللغة العربية',
    'english': 'اللغة الإنجليزية',
    'physics': 'الفيزياء',
    'chemistry': 'الكيمياء',
    'biology': 'الأحياء',
    'computer': 'علوم الحاسب',
  };

  return subjects[subjectValue] || subjectValue;
}

function getDifficultyName(difficulty: string): string {
  const difficulties: Record<string, string> = {
    'easy': 'سهل',
    'medium': 'متوسط',
    'hard': 'صعب',
    'mixed': 'مختلط',
  };

  return difficulties[difficulty] || difficulty;
}

function getQuestionTypeName(type: string): string {
  const types: Record<string, string> = {
    'multiple-choice': 'اختيار من متعدد',
    'true-false': 'صح/خطأ',
    'short-answer': 'إجابة قصيرة',
    'essay': 'مقال',
  };

  return types[type] || type;
}