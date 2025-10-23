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
    const rateLimitResult = await rateLimit(request, 10, 'generate_test'); // 10 requests per window
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

    const { subject, difficulty, questionCount, questionTypes, timeLimit, lesson } = await request.json();

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
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

    // Create exam in database
    const newExam = await prisma.aiGeneratedExam.create({
      data: {
        userId: user.id,
        title: generatedTest.title,
        subject: subject.toUpperCase(),
        year: new Date().getFullYear(),
        lesson: lesson || '',
        difficulty: difficulty || 'mixed',
        timeLimit: timeLimit || 30,
      }
    });

    // Create questions in database
    for (const q of generatedTest.questions) {
      await prisma.aiQuestion.create({
        data: {
          examId: newExam.id,
          question: q.question,
          type: q.type.toUpperCase().replace('-', '_'),
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          points: q.points || 1
        }
      });
    }

    // Return the created exam with questions
    const examWithQuestions = await prisma.aiGeneratedExam.findUnique({
      where: { id: newExam.id },
      include: { questions: true }
    });

    return NextResponse.json({ test: examWithQuestions });
  } catch (error) {
    console.error('Error generating test:', error);
    return NextResponse.json(
      { error: 'Failed to generate test' },
      { status: 500 }
    );
  }
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