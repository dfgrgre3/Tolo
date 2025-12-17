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

  const prompt = `ظ‚ظ… ط¨ط¥ظ†ط´ط§ط، ظ…ظ„ط®طµ ط´ط§ظ…ظ„ ظˆظ…ظپظٹط¯ ظ„ظ„ظ†طµ ط§ظ„طھط§ظ„ظٹ ط¨ط§ظ„ط¹ط±ط¨ظٹط©. ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط§ظ„ظ…ظ„ط®طµ:
- ظˆط§ط¶ط­ ظˆظ…ط®طھطµط± (ط¨ط­ط¯ ط£ظ‚طµظ‰ ${maxLength} ظƒظ„ظ…ط©)
- ظٹط­طھظˆظٹ ط¹ظ„ظ‰ ط§ظ„ظ†ظ‚ط§ط· ط§ظ„ط±ط¦ظٹط³ظٹط©
- ظ…ظ†ط§ط³ط¨ ظ„ظ„ط·ظ„ط§ط¨
- ظ…ظ†ط¸ظ… ظپظٹ ظ†ظ‚ط§ط· ط£ظˆ ظپظ‚ط±ط§طھ ظ‚طµظٹط±ط©

ط§ظ„ظ†طµ:
${text}

ط£ط¬ط¨ ط¨طµظٹط؛ط© JSON:
{
  "title": "ط¹ظ†ظˆط§ظ† ط§ظ„ظ…ظ„ط®طµ",
  "summary": "ط§ظ„ظ…ظ„ط®طµ ظ‡ظ†ط§",
  "keyPoints": ["ظ†ظ‚ط·ط© 1", "ظ†ظ‚ط·ط© 2", "ظ†ظ‚ط·ط© 3"],
  "difficulty": "easy|medium|hard",
  "estimatedReadTime": "ط¹ط¯ط¯ ط§ظ„ط¯ظ‚ط§ط¦ظ‚"
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
      title: summary.title || 'ظ…ظ„ط®طµ طھظ„ظ‚ط§ط¦ظٹ',
      content: JSON.stringify(summary),
      subject: subject || null,
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
    title: summary.title || 'ظ…ظ„ط®طµ طھظ„ظ‚ط§ط¦ظٹ',
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

  const prompt = `ظ‚ظ… ط¨ط¥ظ†ط´ط§ط، ${count} ط¨ط·ط§ظ‚ط© طھط¹ظ„ظٹظ…ظٹط© (Flashcard) ظ…ظ† ط§ظ„ظ†طµ ط§ظ„طھط§ظ„ظٹ ط¨ط§ظ„ط¹ط±ط¨ظٹط©. ظƒظ„ ط¨ط·ط§ظ‚ط© ظٹط¬ط¨ ط£ظ† طھط­طھظˆظٹ ط¹ظ„ظ‰:
- ط³ط¤ط§ظ„ ط£ظˆ ظ…ظپظ‡ظˆظ… ظ…ظ† ط§ظ„ط¬ط§ظ†ط¨ ط§ظ„ط£ظ…ط§ظ…ظٹ
- ط¥ط¬ط§ط¨ط© ط£ظˆ ط´ط±ط­ ظ…ظ† ط§ظ„ط¬ط§ظ†ط¨ ط§ظ„ط®ظ„ظپظٹ
- ظ…ظˆط¶ظˆط¹ ط£ظˆ ظپط¦ط© (ط§ط®طھظٹط§ط±ظٹ)

ط§ظ„ظ†طµ:
${text}

ط£ط¬ط¨ ط¨طµظٹط؛ط© JSON:
{
  "title": "ط¨ط·ط§ظ‚ط§طھ طھط¹ظ„ظٹظ…ظٹط©",
  "flashcards": [
    {
      "front": "ط§ظ„ط³ط¤ط§ظ„ ط£ظˆ ط§ظ„ظ…ظپظ‡ظˆظ…",
      "back": "ط§ظ„ط¥ط¬ط§ط¨ط© ط£ظˆ ط§ظ„ط´ط±ط­",
      "category": "ط§ظ„ظپط¦ط©"
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
      title: flashcards.title || 'ط¨ط·ط§ظ‚ط§طھ طھط¹ظ„ظٹظ…ظٹط©',
      content: JSON.stringify(flashcards),
      subject: subject || null,
      metadata: JSON.stringify({
        count: flashcards.flashcards?.length || 0
      })
    }
  });

  return {
    id: saved.id,
    type: 'flashcard',
    title: flashcards.title || 'ط¨ط·ط§ظ‚ط§طھ طھط¹ظ„ظٹظ…ظٹط©',
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

  const prompt = `ظ‚ظ… ط¨ط¥ظ†ط´ط§ط، ط®ط·ط© ط¯ط±ط§ط³ظٹط© ظ…ظپطµظ„ط© ط¨ط§ظ„ط¹ط±ط¨ظٹط© ظ„ظ…ط¯ط© ${duration} ط£ظٹط§ظ… ط¨ظ…ط¹ط¯ظ„ ${hoursPerDay} ط³ط§ط¹ط© ظٹظˆظ…ظٹط§ظ‹.

ط§ظ„ظ…ظˆط§ط¯ ط§ظ„ط¯ط±ط§ط³ظٹط©:
${subjects.join(', ')}

ط³ط¬ظ„ ط§ظ„ط¯ط±ط§ط³ط© ط§ظ„ط³ط§ط¨ظ‚:
${JSON.stringify(studyHistory, null, 2)}

ط£ط¬ط¨ ط¨طµظٹط؛ط© JSON:
{
  "title": "ط®ط·ط© ط¯ط±ط§ط³ظٹط©",
  "duration": ${duration},
  "totalHours": ${duration * hoursPerDay},
  "dailySchedule": [
    {
      "day": "ط§ظ„ظٹظˆظ… 1",
      "date": "2024-01-01",
      "subjects": [
        {
          "subject": "ط§ط³ظ… ط§ظ„ظ…ط§ط¯ط©",
          "duration": "ط³ط§ط¹ط©",
          "topics": ["ظ…ظˆط¶ظˆط¹ 1", "ظ…ظˆط¶ظˆط¹ 2"],
          "activities": ["ظ‚ط±ط§ط،ط©", "ط­ظ„ طھظ…ط§ط±ظٹظ†"]
        }
      ],
      "totalHours": ${hoursPerDay}
    }
  ],
  "tips": ["ظ†طµظٹط­ط© 1", "ظ†طµظٹط­ط© 2"],
  "goals": ["ظ‡ط¯ظپ 1", "ظ‡ط¯ظپ 2"]
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
      title: studyPlan.title || 'ط®ط·ط© ط¯ط±ط§ط³ظٹط©',
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
    title: studyPlan.title || 'ط®ط·ط© ط¯ط±ط§ط³ظٹط©',
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

  const prompt = `ظ‚ظ… ط¨ط¥ظ†ط´ط§ط، ${count} ط³ط¤ط§ظ„ طھط¯ط±ظٹط¨ظٹ ط¨ط§ظ„ط¹ط±ط¨ظٹط© ط­ظˆظ„ ط§ظ„ظ…ظˆط¶ظˆط¹ ط§ظ„طھط§ظ„ظٹ ط¨ظ…ط³طھظˆظ‰ طµط¹ظˆط¨ط© ${difficulty}.

ط§ظ„ظ…ظˆط¶ظˆط¹: ${topic}

ظƒظ„ ط³ط¤ط§ظ„ ظٹط¬ط¨ ط£ظ† ظٹط­طھظˆظٹ ط¹ظ„ظ‰:
- ظ†طµ ط§ظ„ط³ط¤ط§ظ„
- ظ†ظˆط¹ ط§ظ„ط³ط¤ط§ظ„ (ط§ط®طھظٹط§ط± ظ…ظ† ظ…طھط¹ط¯ط¯طŒ طµط­/ط®ط·ط£طŒ ط¥ط¬ط§ط¨ط© ظ‚طµظٹط±ط©)
- ط§ظ„ط®ظٹط§ط±ط§طھ (ط¥ظ† ظƒط§ظ† ط§ط®طھظٹط§ط± ظ…ظ† ظ…طھط¹ط¯ط¯)
- ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©
- ط´ط±ط­ ط§ظ„ط¥ط¬ط§ط¨ط© (ط§ط®طھظٹط§ط±ظٹ)

ط£ط¬ط¨ ط¨طµظٹط؛ط© JSON:
{
  "title": "ط£ط³ط¦ظ„ط© طھط¯ط±ظٹط¨ظٹط©",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "ظ†طµ ط§ظ„ط³ط¤ط§ظ„",
      "type": "multiple_choice|true_false|short_answer",
      "options": ["ط®ظٹط§ط± 1", "ط®ظٹط§ط± 2", "ط®ظٹط§ط± 3", "ط®ظٹط§ط± 4"],
      "correctAnswer": "ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©",
      "explanation": "ط´ط±ط­ ط§ظ„ط¥ط¬ط§ط¨ط©"
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
      title: questions.title || 'ط£ط³ط¦ظ„ط© طھط¯ط±ظٹط¨ظٹط©',
      content: JSON.stringify(questions),
      subject: subject || null,
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
    title: questions.title || 'ط£ط³ط¦ظ„ط© طھط¯ط±ظٹط¨ظٹط©',
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
            content: 'ط£ظ†طھ ظ…ط³ط§ط¹ط¯ ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ ظ…طھط®طµطµ ظپظٹ ط§ظ„طھط¹ظ„ظٹظ…. ظٹط¬ط¨ ط£ظ† طھط¬ظٹط¨ ط¨طµظٹط؛ط© JSON ظپظ‚ط·.'
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
      title: 'ظ…ط­طھظˆظ‰ ظ…ظ†ط´ط£',
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

  const prompt = `ط£ظ†طھ ظ…ط³ط§ط¹ط¯ طھط¹ظ„ظٹظ…ظٹ ط°ظƒظٹ ظ„ظ„ط·ظ„ط§ط¨. ط£ط¬ط¨ ط¹ظ„ظ‰ ط³ط¤ط§ظ„ ط§ظ„ط·ط§ظ„ط¨ ط§ظ„طھط§ظ„ظٹ:
${message}

طھط§ط±ظٹط® ط§ظ„ظ…ط­ط§ط¯ط«ط©:
${history.map(m => `${m.role}: ${m.content}`).join('\n')}
`;

  const content = await callAI(prompt, provider);
  return typeof content === 'string' ? content : JSON.stringify(content);
}
