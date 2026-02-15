import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from '@/lib/db';
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { subject, year, lesson, difficulty, questionCount, provider } = await req.json();

      if (!subject || !year || !lesson) {
        return NextResponse.json(
          { error: "ط§ظ„ط±ط¬ط§ط، طھظˆظپظٹط± ط§ظ„ظ…ط§ط¯ط© ظˆط§ظ„ط³ظ†ط© ط§ظ„ط¯ط±ط§ط³ظٹط© ظˆط§ظ„ط¯ط±ط³" },
          { status: 400 }
        );
      }

      // طھط­ط¯ظٹط¯ ط¹ط¯ط¯ ط§ظ„ط£ط³ط¦ظ„ط© ط§ظ„ط§ظپطھط±ط§ط¶ظٹ ط¥ط°ط§ ظ„ظ… ظٹطھظ… طھط­ط¯ظٹط¯ظ‡
      const numQuestions = questionCount || 10;

      // طھط­ط¯ظٹط¯ ظ…ظ‚ط¯ظ… ط§ظ„ط®ط¯ظ…ط©
      const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

      if (!validateApiKey(selectedProvider === AI_PROVIDERS.OPENAI ? 'OPENAI' : 'GEMINI')) {
        return NextResponse.json(
          { error: `ظ…ظپطھط§ط­ API ظ„ظ€ ${selectedProvider.name} ط؛ظٹط± ظ…ظ‡ظٹط£` },
          { status: 500 }
        );
      }

      // ط¥ظ†ط´ط§ط، ط±ط³ط§ظ„ط© ط§ظ„ظ†ط¸ط§ظ… ظ„طھظˆط¬ظٹظ‡ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ظ„ط¥ظ†ط´ط§ط، ط§ظ…طھط­ط§ظ†
      const systemPrompt = `ط£ظ†طھ ظ…ط³ط§ط¹ط¯ ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ ظ…طھط®طµطµ ظپظٹ ط¥ظ†ط´ط§ط، ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„طھط¹ظ„ظٹظ…ظٹط© ظ„ظ…ظ†طµط© ط«ظ†ط§ظˆظٹ. 
    ظ…ظ‡ظ…طھظƒ ظ‡ظٹ ط¥ظ†ط´ط§ط، ط§ظ…طھط­ط§ظ† ظ„ظ…ط§ط¯ط© ${subject} ظ„ظ„ط³ظ†ط© ط§ظ„ط¯ط±ط§ط³ظٹط© ${year}طŒ focusing ط¹ظ„ظ‰ ط¯ط±ط³ ${lesson}.
    ${difficulty ? `ظ…ط³طھظˆظ‰ ط§ظ„طµط¹ظˆط¨ط©: ${difficulty}` : ''}
    ظ‚ظ… ط¨ط¥ظ†ط´ط§ط، ${numQuestions} ط£ط³ط¦ظ„ط© ظ…طھظ†ظˆط¹ط© (ط§ط®طھظٹط§ط± ظ…ظ† ظ…طھط¹ط¯ط¯طŒ طµط­ ط£ظˆ ط®ط·ط£طŒ ط¥ط¬ط§ط¨ط§طھ ظ‚طµظٹط±ط©).
    ظ„ظƒظ„ ط³ط¤ط§ظ„طŒ ظ‚ظ… ط¨طھظˆظپظٹط±:
    1. ظ†طµ ط§ظ„ط³ط¤ط§ظ„
    2. ط§ظ„ط®ظٹط§ط±ط§طھ (ظ„ط£ط³ط¦ظ„ط© ط§ظ„ط§ط®طھظٹط§ط± ظ…ظ† ظ…طھط¹ط¯ط¯)
    3. ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©
    4. ط´ط±ط­ ظ…ظˆط¬ط² ظ„ظ„ط¥ط¬ط§ط¨ط©

    ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط§ظ„ط£ط³ط¦ظ„ط© ظ…ظ†ط§ط³ط¨ط© ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط¯ط±ط§ط³ظٹ ظˆطھط؛ط·ظٹ ط§ظ„ظ…ظپط§ظ‡ظٹظ… ط§ظ„ط±ط¦ظٹط³ظٹط© ظ„ظ„ط¯ط±ط³ ط§ظ„ظ…ط­ط¯ط¯.
    ظ‚ظ… ط¨طھظ†ط³ظٹظ‚ ط§ظ„ط¥ط¬ط§ط¨ط© ظƒظ€ JSON ظ…ط¹ ط§ظ„ظ…طµظپظˆظپط§طھ ط§ظ„طھط§ظ„ظٹط©:
    {
      "questions": [
        {
          "question": "ظ†طµ ط§ظ„ط³ط¤ط§ظ„",
          "type": "multiple_choice|true_false|short_answer",
          "options": ["ط®ظٹط§ط± 1", "ط®ظٹط§ط± 2", "ط®ظٹط§ط± 3", "ط®ظٹط§ط± 4"],
          "correctAnswer": "ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©",
          "explanation": "ط´ط±ط­ ظ…ظˆط¬ط² ظ„ظ„ط¥ط¬ط§ط¨ط©"
        }
      ]
    }`;

      let examContent = "";

      if (selectedProvider === AI_PROVIDERS.OPENAI) {
        // ط§ط³طھط®ط¯ط§ظ… OpenAI API
        const response = await fetch(selectedProvider.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${selectedProvider.apiKey}`
          },
          body: JSON.stringify({
            model: selectedProvider.model,
            messages: [{ role: "system", content: systemPrompt }],
            temperature: 0.7,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          logger.error("Error from OpenAI:", errorData);
          return NextResponse.json({
            error: "ط¹ط°ط±ط§ظ‹طŒ ظٹظˆط§ط¬ظ‡ ط§ظ„ظ†ط¸ط§ظ… ط¨ط¹ط¶ ط§ظ„طµط¹ظˆط¨ط§طھ ط§ظ„طھظ‚ظ†ظٹط© ظپظٹ ط¥ظ†ط´ط§ط، ط§ظ„ط§ظ…طھط­ط§ظ† ط­ط§ظ„ظٹط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹."
          }, { status: 500 });
        }

        const data = await response.json();
        examContent = data.choices[0].message.content;
      } else {
        // ط§ط³طھط®ط¯ط§ظ… Google Gemini API
        const response = await fetch(`${selectedProvider.baseUrl}${selectedProvider.model}:generateContent?key=${selectedProvider.apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{ text: systemPrompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4000,
            },
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          logger.error("Error from Gemini:", errorData);
          return NextResponse.json({
            error: "ط¹ط°ط±ط§ظ‹طŒ ظٹظˆط§ط¬ظ‡ ط§ظ„ظ†ط¸ط§ظ… ط¨ط¹ط¶ ط§ظ„طµط¹ظˆط¨ط§طھ ط§ظ„طھظ‚ظ†ظٹط© ظپظٹ ط¥ظ†ط´ط§ط، ط§ظ„ط§ظ…طھط­ط§ظ† ط­ط§ظ„ظٹط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹."
          }, { status: 500 });
        }

        const data = await response.json();
        examContent = data.candidates[0].content.parts[0].text;
      }

      // ظ…ط­ط§ظˆظ„ط© طھط­ظ„ظٹظ„ ط§ظ„ظ…ط­طھظˆظ‰ ظƒظ€ JSON
      try {
        const examData = JSON.parse(examContent);

        // ط­ظپط¸ ط§ظ„ط§ظ…طھط­ط§ظ† ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
        const exam = await prisma.exam.create({
          data: {
            id: randomUUID(),
            subjectId: subject, // subject here is likely the ID from the req.json()
            title: `ط§ظ…طھط­ط§ظ† ${subject} - ${year} - ${lesson}`,
            year: parseInt(year),
            url: "", // ط³ظٹطھظ… طھط­ط¯ظٹط«ظ‡ ظ„ط§ط­ظ‚ط§ظ‹ ط¹ظ†ط¯ ط¥ظ†ط´ط§ط، ظˆط§ط¬ظ‡ط© ط§ظ„ط§ظ…طھط­ط§ظ†
          }
        });

        return NextResponse.json({
          examId: exam.id,
          questions: examData.questions,
          provider: selectedProvider.name
        });
      } catch (parseError) {
        logger.error("Error parsing exam JSON:", parseError);

        // ط¥ط°ط§ ظپط´ظ„ طھط­ظ„ظٹظ„ JSONطŒ ظ‚ظ… ط¨ط¥ط±ط¬ط§ط¹ ط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„ط®ط§ظ…
        return NextResponse.json({
          examContent,
          provider: selectedProvider.name
        });
      }
    } catch (error) {
      logger.error("Error in AI exam generation API:", error);
      return NextResponse.json(
        { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ظ…ط¹ط§ظ„ط¬ط© ط·ظ„ط¨ظƒ" },
        { status: 500 }
      );
    }
  });
}
