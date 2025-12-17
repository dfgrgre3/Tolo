import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { OpenAI } from 'openai';
import { rateLimit } from '@/lib/api-utils';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// Initialize OpenAI client lazily/conditionally to avoid build errors
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Apply rate limiting
      const rateLimitResult = await rateLimit(req, 20, 'evaluate_test'); // 20 requests per window
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Verify authentication
      const decodedToken = verifyToken(req);
      if (!decodedToken) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { testId, answers, timeSpent } = await req.json();

      if (!testId || !answers) {
        return NextResponse.json(
          { error: 'Test ID and answers are required' },
          { status: 400 }
        );
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decodedToken.userId }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Get test with questions from database
      const test = await prisma.aiGeneratedExam.findUnique({
        where: { id: testId },
        include: { questions: true }
      });

      if (!test) {
        return NextResponse.json(
          { error: 'Test not found' },
          { status: 404 }
        );
      }

      // Prepare answers and questions for AI evaluation
      const questionsForEvaluation = test.questions.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options ? JSON.parse(q.options) : null,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        points: q.points
      }));

      const userAnswersForEvaluation = answers.map((a: { questionId: string; value: string }) => ({
        questionId: a.questionId,
        value: a.value
      }));

      // Create prompt for AI to evaluate answers
      const prompt = `
        قم بتقييم إجابات الطالب على الاختبار التالي في مادة ${getSubjectName(test.subject)}.

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
      const testResult = await prisma.testResult.create({
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
      return NextResponse.json({
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
      return NextResponse.json(
        { error: 'Failed to evaluate test' },
        { status: 500 }
      );
    }
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