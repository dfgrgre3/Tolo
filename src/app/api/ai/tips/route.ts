
import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { AI_PROVIDERS, getDefaultProvider } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { userId, subject, studyGoal, challenges, currentGrade, provider } = await req.json();

      // طھط­ط¯ظٹط¯ ظ…ظ‚ط¯ظ… ط§ظ„ط®ط¯ظ…ط©
      const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

      if (!selectedProvider.apiKey) {
        return NextResponse.json(
          { error: `ظ…ظپطھط§ط­ API ظ„ظ€ ${selectedProvider.name} ط؛ظٹط± ظ…ظ‡ظٹط£` },
          { status: 500 }
        );
      }

      // ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ… ط¥ط°ط§ طھظ… طھظˆظپظٹط± ظ…ط¹ط±ظپ ط§ظ„ظ…ط³طھط®ط¯ظ…
      let userData = null;
      if (userId) {
        userData = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            subjectEnrollments: {
              take: 10
            },
            progressSnapshots: {
              orderBy: { date: 'desc' },
              take: 5
            },
            examResults: {
              orderBy: { takenAt: 'desc' },
              take: 5
            }
          }
        });
      }

      // ط¥ظ†ط´ط§ط، ط±ط³ط§ظ„ط© ط§ظ„ظ†ط¸ط§ظ… ظ„طھظˆط¬ظٹظ‡ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ظ„طھظ‚ط¯ظٹظ… ط§ظ„ظ†طµط§ط¦ط­
      const systemPrompt = `ط£ظ†طھ ظ…ط³ط§ط¹ط¯ ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ ظ…طھط®طµطµ ظپظٹ ط§ظ„ط¥ط±ط´ط§ط¯ ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹ ظ„ظ…ظ†طµط© ط«ظ†ط§ظˆظٹ.
    ظ…ظ‡ظ…طھظƒ ظ‡ظٹ طھظ‚ط¯ظٹظ… ظ†طµط§ط¦ط­ طھط¹ظ„ظٹظ…ظٹط© ظ…ط®طµطµط© ظˆظپط¹ط§ظ„ط© ظ„ظ„ط·ط§ظ„ط¨.

    ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ط·ط§ظ„ط¨:
    ${userData ? `
    - ط§ظ„ط§ط³ظ…: ${userData.name || "ط؛ظٹط± ظ…ط­ط¯ط¯"}
    - ط§ظ„ظ…ظˆط§ط¯ ط§ظ„ظ…ط³ط¬ظ„ط©: ${userData.subjectEnrollments?.map((s) => s.subjectId).join(", ") || "ظ„ط§ طھظˆط¬ط¯ ظ…ظˆط§ط¯ ظ…ط³ط¬ظ„ط©"}
    - ظ…طھظˆط³ط· ط¯ط±ط¬ط§طھ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„ط£ط®ظٹط±ط©: ${userData.examResults && userData.examResults.length > 0 ? (userData.examResults.reduce((sum: number, exam) => sum + exam.score, 0) / userData.examResults.length).toFixed(2) : "ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ"}
    - ظ…طھظˆط³ط· ظˆظ‚طھ ط§ظ„ط¯ط±ط§ط³ط© ط§ظ„ط£ط³ط¨ظˆط¹ظٹ: ${userData.progressSnapshots && userData.progressSnapshots.length > 0 ? (userData.progressSnapshots.reduce((sum: number, p) => sum + p.totalStudyMinutes, 0) / userData.progressSnapshots.length / 60).toFixed(2) + " ط³ط§ط¹ط§طھ" : "ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ"}
    ` : "ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظ…ط³طھط®ط¯ظ… ظ…طھط§ط­ط©"}

    ط·ظ„ط¨ ط§ظ„ظ†طµط§ط¦ط­:
    ${subject ? `- ط§ظ„ظ…ط§ط¯ط©: ${subject}` : ""}
    ${studyGoal ? `- ط§ظ„ظ‡ط¯ظپ ط§ظ„ط¯ط±ط§ط³ظٹ: ${studyGoal}` : ""}
    ${challenges ? `- ط§ظ„طھط­ط¯ظٹط§طھ ط§ظ„طھظٹ ظٹظˆط§ط¬ظ‡ظ‡ط§ ط§ظ„ط·ط§ظ„ط¨: ${challenges}` : ""}
    ${currentGrade ? `- ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط¯ط±ط§ط³ظٹ ط§ظ„ط­ط§ظ„ظٹ: ${currentGrade}` : ""}

    ظ‚ظ… ط¨طھظ‚ط¯ظٹظ… ظ†طµط§ط¦ط­ ط¹ظ…ظ„ظٹط© ظˆظ…ط®طµطµط© طھط´ظ…ظ„:
    1. ط§ط³طھط±ط§طھظٹط¬ظٹط§طھ ط§ظ„ط¯ط±ط§ط³ط© ط§ظ„ظپط¹ط§ظ„ط©
    2. ظƒظٹظپظٹط© ط§ظ„طھط؛ظ„ط¨ ط¹ظ„ظ‰ ط§ظ„طھط­ط¯ظٹط§طھ ط§ظ„ظ…ط°ظƒظˆط±ط©
    3. ظ…طµط§ط¯ط± طھط¹ظ„ظٹظ…ظٹط© ظ…ظˆطµظ‰ ط¨ظ‡ط§
    4. ط®ط·ط© ط¯ط±ط§ط³ظٹط© ظ…ظ‚طھط±ط­ط©
    5. ظ†طµط§ط¦ط­ ظ„طھط­ط³ظٹظ† ط§ظ„ط£ط¯ط§ط، ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹ

    ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط§ظ„ظ†طµط§ط¦ط­ ط¹ظ…ظ„ظٹط© ظˆظˆط§ظ‚ط¹ظٹط© ظˆظ‚ط§ط¨ظ„ط© ظ„ظ„طھط·ط¨ظٹظ‚.
    ظ‚ظ… ط¨طھظ†ط³ظٹظ‚ ط§ظ„ط¥ط¬ط§ط¨ط© ظƒظ€ JSON ظ…ط¹ ط§ظ„ط¨ظ†ظٹط© ط§ظ„طھط§ظ„ظٹط©:
    {
      "tips": [
        {
          "category": "ط§ط³طھط±ط§طھظٹط¬ظٹط§طھ ط§ظ„ط¯ط±ط§ط³ط©|ط§ظ„طھط؛ظ„ط¨ ط¹ظ„ظ‰ ط§ظ„طھط­ط¯ظٹط§طھ|ط§ظ„ظ…طµط§ط¯ط± ط§ظ„طھط¹ظ„ظٹظ…ظٹط©|ط§ظ„ط®ط·ط© ط§ظ„ط¯ط±ط§ط³ظٹط©|طھط­ط³ظٹظ† ط§ظ„ط£ط¯ط§ط،",
          "title": "ط¹ظ†ظˆط§ظ† ط§ظ„ظ†طµظٹط­ط©",
          "content": "ظ…ط­طھظˆظ‰ ط§ظ„ظ†طµظٹط­ط© ط§ظ„ظ…ظپطµظ„",
          "priority": "high|medium|low"
        }
      ],
      "summary": "ظ…ظ„ط®طµ ط´ط§ظ…ظ„ ظ„ظ„ظ†طµط§ط¦ط­ ط§ظ„ظ…ظ‚ط¯ظ…ط©"
    }`;

      let tipsContent = "";

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
            error: "ط¹ط°ط±ط§ظ‹طŒ ظٹظˆط§ط¬ظ‡ ط§ظ„ظ†ط¸ط§ظ… ط¨ط¹ط¶ ط§ظ„طµط¹ظˆط¨ط§طھ ط§ظ„طھظ‚ظ†ظٹط© ظپظٹ طھظ‚ط¯ظٹظ… ط§ظ„ظ†طµط§ط¦ط­ ط­ط§ظ„ظٹط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹."
          }, { status: 500 });
        }

        const data = await response.json();
        tipsContent = data.choices[0].message.content;
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
            error: "ط¹ط°ط±ط§ظ‹طŒ ظٹظˆط§ط¬ظ‡ ط§ظ„ظ†ط¸ط§ظ… ط¨ط¹ط¶ ط§ظ„طµط¹ظˆط¨ط§طھ ط§ظ„طھظ‚ظ†ظٹط© ظپظٹ طھظ‚ط¯ظٹظ… ط§ظ„ظ†طµط§ط¦ط­ ط­ط§ظ„ظٹط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹."
          }, { status: 500 });
        }

        const data = await response.json();
        tipsContent = data.candidates[0].content.parts[0].text;
      }

      // ظ…ط­ط§ظˆظ„ط© طھط­ظ„ظٹظ„ ط§ظ„ظ…ط­طھظˆظ‰ ظƒظ€ JSON
      try {
        const tipsData = JSON.parse(tipsContent);

        // ط­ظپط¸ ط§ظ„ظ†طµط§ط¦ط­ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط¥ط°ط§ ظƒط§ظ† ظ‡ظ†ط§ظƒ ظ…ط¹ط±ظپ ظ…ط³طھط®ط¯ظ…
        if (userId) {
          for (const tip of tipsData.tips) {
            try {
              await prisma.aiGeneratedContent.create({
                data: {
                  userId: userId,
                  type: 'study_tip',
                  title: tip.title,
                  content: JSON.stringify(tip)
                }
              });
            } catch (dbError) {
              logger.error("Error saving recommendation to database:", dbError);
            }
          }
        }

        return NextResponse.json({
          ...tipsData,
          provider: selectedProvider.name
        });
      } catch (parseError) {
        logger.error("Error parsing tips JSON:", parseError);

        // ط¥ط°ط§ ظپط´ظ„ طھط­ظ„ظٹظ„ JSONطŒ ظ‚ظ… ط¨ط¥ط±ط¬ط§ط¹ ط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„ط®ط§ظ…
        return NextResponse.json({
          rawContent: tipsContent,
          message: "طھظ… ط¥ظ†ط´ط§ط، ط§ظ„ظ†طµط§ط¦ط­ ظˆظ„ظƒظ† ط­ط¯ط« ط®ط·ط£ ظپظٹ طھظ†ط³ظٹظ‚ظ‡ط§. ظٹط±ط¬ظ‰ ظ…ط±ط§ط¬ط¹ط© ط§ظ„ظ…ط­طھظˆظ‰ ط£ط¯ظ†ط§ظ‡.",
          provider: selectedProvider.name
        });
      }
    } catch (error: unknown) {
      logger.error("Error in AI tips API:", error);
      return NextResponse.json(
        { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ظ…ط¹ط§ظ„ط¬ط© ط·ظ„ط¨ظƒ" },
        { status: 500 }
      );
    }
  });
}
