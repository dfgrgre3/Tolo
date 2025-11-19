import { AI_PROVIDERS, getDefaultProvider } from '@/lib/ai-config';
import { prisma } from '@/lib/prisma';

import { logger } from '@/lib/logger';

export interface GeneratedContent {
  id: string;
  type: 'summary' | 'flashcard' | 'study_plan' | 'practice_question';
  title: string;
  content: any; // Structured content based on type
  subject?: string;
  metadata?: Record<string, any>;
}

/**
 * Generate automatic summary of content
 */
export async function generateSummary(
  text: string,
  userId: string,
  subject?: string,
  maxLength: number = 500
): Promise<GeneratedContent> {
  const provider = getDefaultProvider();
  
  const prompt = `قم بإنشاء ملخص شامل ومفيد للنص التالي بالعربية. يجب أن يكون الملخص:
- واضح ومختصر (بحد أقصى ${maxLength} كلمة)
- يحتوي على النقاط الرئيسية
- مناسب للطلاب
- منظم في نقاط أو فقرات قصيرة

النص:
${text}

أجب بصيغة JSON:
{
  "title": "عنوان الملخص",
  "summary": "الملخص هنا",
  "keyPoints": ["نقطة 1", "نقطة 2", "نقطة 3"],
  "difficulty": "easy|medium|hard",
  "estimatedReadTime": "عدد الدقائق"
}`;

  const content = await callAI(prompt, provider);
  
  const summary = typeof content === 'string' 
    ? parseJSONResponse(content)
    : content;

  // Save to database
  const saved = await prisma.aiGeneratedContent.create({
    data: {
      userId,
      type: 'summary',
      title: summary.title || 'ملخص تلقائي',
      content: JSON.stringify(summary),
      subject: subject || null,
      metadata: {
        originalLength: text.length,
        summaryLength: summary.summary?.length || 0,
        maxLength
      }
    }
  });

  return {
    id: saved.id,
    type: 'summary',
    title: summary.title || 'ملخص تلقائي',
    content: summary,
    subject,
    metadata: saved.metadata as any
  };
}

/**
 * Generate flashcards from content
 */
export async function generateFlashcards(
  text: string,
  userId: string,
  subject?: string,
  count: number = 10
): Promise<GeneratedContent> {
  const provider = getDefaultProvider();
  
  const prompt = `قم بإنشاء ${count} بطاقة تعليمية (Flashcard) من النص التالي بالعربية. كل بطاقة يجب أن تحتوي على:
- سؤال أو مفهوم من الجانب الأمامي
- إجابة أو شرح من الجانب الخلفي
- موضوع أو فئة (اختياري)

النص:
${text}

أجب بصيغة JSON:
{
  "title": "بطاقات تعليمية",
  "flashcards": [
    {
      "front": "السؤال أو المفهوم",
      "back": "الإجابة أو الشرح",
      "category": "الفئة"
    }
  ]
}`;

  const content = await callAI(prompt, provider);
  
  const flashcards = typeof content === 'string'
    ? parseJSONResponse(content)
    : content;

  // Save to database
  const saved = await prisma.aiGeneratedContent.create({
    data: {
      userId,
      type: 'flashcard',
      title: flashcards.title || 'بطاقات تعليمية',
      content: JSON.stringify(flashcards),
      subject: subject || null,
      metadata: {
        count: flashcards.flashcards?.length || 0
      }
    }
  });

  return {
    id: saved.id,
    type: 'flashcard',
    title: flashcards.title || 'بطاقات تعليمية',
    content: flashcards,
    subject,
    metadata: saved.metadata as any
  };
}

/**
 * Generate study plan
 */
export async function generateStudyPlan(
  userId: string,
  subjects: string[],
  duration: number = 7, // days
  hoursPerDay: number = 2
): Promise<GeneratedContent> {
  const provider = getDefaultProvider();

  // Get user's study history for context
  const userStudySessions = await prisma.studySession.findMany({
    where: { userId },
    take: 50,
    orderBy: { startTime: 'desc' }
  });

  const studyHistory = userStudySessions.map((s: { subject: string | null; durationMin: number; startTime: Date }) => ({
    subject: s.subject,
    duration: s.durationMin,
    date: s.startTime
  }));

  const prompt = `قم بإنشاء خطة دراسية مفصلة بالعربية لمدة ${duration} أيام بمعدل ${hoursPerDay} ساعة يومياً.

المواد الدراسية:
${subjects.join(', ')}

سجل الدراسة السابق:
${JSON.stringify(studyHistory, null, 2)}

أجب بصيغة JSON:
{
  "title": "خطة دراسية",
  "duration": ${duration},
  "totalHours": ${duration * hoursPerDay},
  "dailySchedule": [
    {
      "day": "اليوم 1",
      "date": "2024-01-01",
      "subjects": [
        {
          "subject": "اسم المادة",
          "duration": "ساعة",
          "topics": ["موضوع 1", "موضوع 2"],
          "activities": ["قراءة", "حل تمارين"]
        }
      ],
      "totalHours": ${hoursPerDay}
    }
  ],
  "tips": ["نصيحة 1", "نصيحة 2"],
  "goals": ["هدف 1", "هدف 2"]
}`;

  const content = await callAI(prompt, provider);
  
  const studyPlan = typeof content === 'string'
    ? parseJSONResponse(content)
    : content;

  // Save to database
  const saved = await prisma.aiGeneratedContent.create({
    data: {
      userId,
      type: 'study_plan',
      title: studyPlan.title || 'خطة دراسية',
      content: JSON.stringify(studyPlan),
      metadata: {
        duration,
        hoursPerDay,
        subjects
      }
    }
  });

  return {
    id: saved.id,
    type: 'study_plan',
    title: studyPlan.title || 'خطة دراسية',
    content: studyPlan,
    metadata: saved.metadata as any
  };
}

/**
 * Generate practice questions
 */
export async function generatePracticeQuestions(
  topic: string,
  userId: string,
  subject?: string,
  count: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<GeneratedContent> {
  const provider = getDefaultProvider();
  
  const prompt = `قم بإنشاء ${count} سؤال تدريبي بالعربية حول الموضوع التالي بمستوى صعوبة ${difficulty}.

الموضوع: ${topic}

كل سؤال يجب أن يحتوي على:
- نص السؤال
- نوع السؤال (اختيار من متعدد، صح/خطأ، إجابة قصيرة)
- الخيارات (إن كان اختيار من متعدد)
- الإجابة الصحيحة
- شرح الإجابة (اختياري)

أجب بصيغة JSON:
{
  "title": "أسئلة تدريبية",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "نص السؤال",
      "type": "multiple_choice|true_false|short_answer",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswer": "الإجابة الصحيحة",
      "explanation": "شرح الإجابة"
    }
  ]
}`;

  const content = await callAI(prompt, provider);
  
  const questions = typeof content === 'string'
    ? parseJSONResponse(content)
    : content;

  // Save to database
  const saved = await prisma.aiGeneratedContent.create({
    data: {
      userId,
      type: 'practice_question',
      title: questions.title || 'أسئلة تدريبية',
      content: JSON.stringify(questions),
      subject: subject || null,
      metadata: {
        count: questions.questions?.length || 0,
        difficulty,
        topic
      }
    }
  });

  return {
    id: saved.id,
    type: 'practice_question',
    title: questions.title || 'أسئلة تدريبية',
    content: questions,
    subject,
    metadata: saved.metadata as any
  };
}

/**
 * Call AI provider
 */
async function callAI(prompt: string, provider: typeof AI_PROVIDERS.OPENAI | typeof AI_PROVIDERS.GEMINI): Promise<any> {
  if (provider === AI_PROVIDERS.OPENAI) {
    const response = await fetch(provider.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'أنت مساعد ذكاء اصطناعي متخصص في التعليم. يجب أن تجيب بصيغة JSON فقط.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate content');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } else {
    // Gemini
    const response = await fetch(
      `${provider.baseUrl}${provider.model}:generateContent?key=${provider.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate content');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
}

/**
 * Parse JSON response from AI
 */
function parseJSONResponse(text: string): any {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    return JSON.parse(jsonStr);
  } catch (error) {
    logger.error('Error parsing JSON response:', error);
    // Return a fallback structure
    return {
      title: 'محتوى منشأ',
      content: text
    };
  }
}

/**
 * Get user's generated content
 */
export async function getUserGeneratedContent(
  userId: string,
  type?: 'summary' | 'flashcard' | 'study_plan' | 'practice_question',
  limit: number = 20
) {
  const where: any = { userId };
  if (type) {
    where.type = type;
  }

  const content = await prisma.aiGeneratedContent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return content.map((item: { id: string; type: string; [key: string]: unknown }) => ({
    id: item.id,
    type: item.type as any,
    title: item.title,
    content: JSON.parse(item.content as string),
    subject: item.subject,
    metadata: item.metadata,
    createdAt: item.createdAt,
    isUsed: item.isUsed
  }));
}

