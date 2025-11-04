import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OpenAI } from 'openai';
import { rateLimit } from '@/lib/api-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 20, 'evaluate_test'); // 20 requests per window
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { testId, answers, timeSpent } = await request.json();

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
    const questionsForEvaluation = test.questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options ? JSON.parse(q.options) : null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      points: q.points
    }));

    const userAnswersForEvaluation = answers.map((a: any) => ({
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
      const result = evaluation.detailedResults.find((r: any) => r.questionId === question.id);
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
        totalPoints,
        timeSpent,
        answers: JSON.stringify(answers),
        feedback: JSON.stringify(evaluation.summary)
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
  } catch (error) {
    console.error('Error evaluating test:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate test' },
      { status: 500 }
    );
  }
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