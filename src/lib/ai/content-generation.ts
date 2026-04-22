import { AI_PROVIDERS, getDefaultProvider } from '@/lib/ai-config';
import { prisma } from '@/lib/db';

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

  const prompt = `88& 7?7?8 7?7?7 8&87?7? 7?7?8&8 8?8&8~8y7? 888 7? 7?87?7?88y 7?7?87?7?7?8y7?. 8y7?7? 7?8  8y8?8?8  7?88&87?7?:
- 8?7?7?7? 8?8&7?7?7?7? (7?7?7? 7?87?80 ${maxLength} 8?88&7?)
- 8y7?7?8?8y 7?880 7?88 87?7? 7?87?7?8y7?8y7?
- 8&8 7?7?7? 887?87?7?
- 8&8 7?8& 8~8y 8 87?7? 7?8? 8~87?7?7? 87?8y7?7?

7?88 7?:
${text}

7?7?7? 7?7?8y77? JSON:
{
  "title": "7?8 8?7?8  7?88&87?7?",
  "summary": "7?88&87?7? 8!8 7?",
  "keyPoints": ["8 87?7? 1", "8 87?7? 2", "8 87?7? 3"],
  "difficulty": "easy|medium|hard",
  "estimatedReadTime": "7?7?7? 7?87?87?7?8"
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
      title: summary.title || '8&87?7? 7?887?7?8y',
      content: JSON.stringify(summary),
      // subject: subject || null,
      metadata: JSON.stringify({
        originalLength: text.length,
        summaryLength: summary.summary?.length || 0,
        maxLength
      })
    }
  });

  return {
    id: saved.id,
    type: 'summary',
    title: summary.title || '8&87?7? 7?887?7?8y',
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

  const prompt = `88& 7?7?8 7?7?7 ${count} 7?7?7?87? 7?7?88y8&8y7? (Flashcard) 8&8  7?88 7? 7?87?7?88y 7?7?87?7?7?8y7?. 8?8 7?7?7?87? 8y7?7? 7?8  7?7?7?8?8y 7?880:
- 7?7?7?8 7?8? 8&8~8!8?8& 8&8  7?87?7?8 7? 7?87?8&7?8&8y
- 7?7?7?7?7? 7?8? 7?7?7? 8&8  7?87?7?8 7? 7?87?88~8y
- 8&8?7?8?7? 7?8? 8~7?7? (7?7?7?8y7?7?8y)

7?88 7?:
${text}

7?7?7? 7?7?8y77? JSON:
{
  "title": "7?7?7?87?7? 7?7?88y8&8y7?",
  "flashcards": [
    {
      "front": "7?87?7?7?8 7?8? 7?88&8~8!8?8&",
      "back": "7?87?7?7?7?7? 7?8? 7?87?7?7?",
      "category": "7?88~7?7?"
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
      title: flashcards.title || '7?7?7?87?7? 7?7?88y8&8y7?',
      content: JSON.stringify(flashcards),
      // subject: subject || null,
      metadata: JSON.stringify({
        count: flashcards.flashcards?.length || 0
      })
    }
  });

  return {
    id: saved.id,
    type: 'flashcard',
    title: flashcards.title || '7?7?7?87?7? 7?7?88y8&8y7?',
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

  const studyHistory = userStudySessions.map((s: { subjectId: string | null; durationMin: number; startTime: Date }) => ({
    subjectId: s.subjectId,
    duration: s.durationMin,
    date: s.startTime
  }));

  const prompt = `88& 7?7?8 7?7?7 7?7?7? 7?7?7?7?8y7? 8&8~7?87? 7?7?87?7?7?8y7? 88&7?7? ${duration} 7?8y7?8& 7?8&7?7?8 ${hoursPerDay} 7?7?7?7? 8y8?8&8y7?89.

7?88&8?7?7? 7?87?7?7?7?8y7?:
${subjects.join(', ')}

7?7?8 7?87?7?7?7?7? 7?87?7?7?8:
${JSON.stringify(studyHistory, null, 2)}

7?7?7? 7?7?8y77? JSON:
{
  "title": "7?7?7? 7?7?7?7?8y7?",
  "duration": ${duration},
  "totalHours": ${duration * hoursPerDay},
  "dailySchedule": [
    {
      "day": "7?88y8?8& 1",
      "date": "2024-01-01",
      "subjects": [
        {
          "subject": "7?7?8& 7?88&7?7?7?",
          "duration": "7?7?7?7?",
          "topics": ["8&8?7?8?7? 1", "8&8?7?8?7? 2"],
          "activities": ["87?7?77?", "7?8 7?8&7?7?8y8 "]
        }
      ],
      "totalHours": ${hoursPerDay}
    }
  ],
  "tips": ["8 7?8y7?7? 1", "8 7?8y7?7? 2"],
  "goals": ["8!7?8~ 1", "8!7?8~ 2"]
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
      title: studyPlan.title || '7?7?7? 7?7?7?7?8y7?',
      content: JSON.stringify(studyPlan),
      metadata: JSON.stringify({
        duration,
        hoursPerDay,
        subjects
      })
    }
  });

  return {
    id: saved.id,
    type: 'study_plan',
    title: studyPlan.title || '7?7?7? 7?7?7?7?8y7?',
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

  const prompt = `88& 7?7?8 7?7?7 ${count} 7?7?7?8 7?7?7?8y7?8y 7?7?87?7?7?8y7? 7?8?8 7?88&8?7?8?7? 7?87?7?88y 7?8&7?7?8?80 7?7?8?7?7? ${difficulty}.

7?88&8?7?8?7?: ${topic}

8?8 7?7?7?8 8y7?7? 7?8  8y7?7?8?8y 7?880:
- 8 7? 7?87?7?7?8
- 8 8?7? 7?87?7?7?8 (7?7?7?8y7?7? 8&8  8&7?7?7?7?7R 7?7?/7?7?7?7R 7?7?7?7?7? 87?8y7?7?)
- 7?87?8y7?7?7?7? (7?8  8?7?8  7?7?7?8y7?7? 8&8  8&7?7?7?7?)
- 7?87?7?7?7?7? 7?87?7?8y7?7?
- 7?7?7? 7?87?7?7?7?7? (7?7?7?8y7?7?8y)

7?7?7? 7?7?8y77? JSON:
{
  "title": "7?7?7?87? 7?7?7?8y7?8y7?",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "8 7? 7?87?7?7?8",
      "type": "multiple_choice|true_false|short_answer",
      "options": ["7?8y7?7? 1", "7?8y7?7? 2", "7?8y7?7? 3", "7?8y7?7? 4"],
      "correctAnswer": "7?87?7?7?7?7? 7?87?7?8y7?7?",
      "explanation": "7?7?7? 7?87?7?7?7?7?"
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
      title: questions.title || '7?7?7?87? 7?7?7?8y7?8y7?',
      content: JSON.stringify(questions),
      // subject: subject || null,
      metadata: JSON.stringify({
        count: questions.questions?.length || 0,
        difficulty,
        topic
      })
    }
  });

  return {
    id: saved.id,
    type: 'practice_question',
    title: questions.title || '7?7?7?87? 7?7?7?8y7?8y7?',
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
            content: '7?8 7? 8&7?7?7?7? 7?8?7?7 7?7?7?8 7?7?8y 8&7?7?7?7? 8~8y 7?87?7?88y8&. 8y7?7? 7?8  7?7?8y7? 7?7?8y77? JSON 8~87?.'
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
      title: '8&7?7?8?80 8&8 7?7?',
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

  return content.map((item: { id: string; type: string;[key: string]: unknown }) => ({
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

/**
 * Generate chat response
 */
export async function generateChatResponse(
  message: string,
  userId: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  const provider = getDefaultProvider();

  const prompt = `7?8 7? 8&7?7?7?7? 7?7?88y8&8y 7?8?8y 887?87?7?. 7?7?7? 7?880 7?7?7?8 7?87?7?87? 7?87?7?88y:
${message}

7?7?7?8y7? 7?88&7?7?7?7?7?:
${history.map(m => `${m.role}: ${m.content}`).join('\n')}
`;

  const content = await callAI(prompt, provider);
  return typeof content === 'string' ? content : JSON.stringify(content);
}
