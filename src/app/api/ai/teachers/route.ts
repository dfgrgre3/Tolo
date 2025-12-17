import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

import { logger } from '@/lib/logger';

// ظˆط§ط¬ظ‡ط© ط¨ط±ظ…ط¬ط© طھط·ط¨ظٹظ‚ط§طھ ط§ظ„ظٹظˆطھظٹط¨ ظ„ظ„ط¨ط­ط« ط¹ظ† ط§ظ„ظ‚ظ†ظˆط§طھ ط§ظ„طھط¹ظ„ظٹظ…ظٹط©
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { subject, keywords, platform, provider } = await req.json();

      if (!subject) {
        return NextResponse.json(
          { error: "ط§ظ„ط±ط¬ط§ط، طھظˆظپظٹط± ط§ظ„ظ…ط§ط¯ط© ط§ظ„ط¯ط±ط§ط³ظٹط©" },
          { status: 400 }
        );
      }

      // طھط­ط¯ظٹط¯ ظ…ظ‚ط¯ظ… ط§ظ„ط®ط¯ظ…ط©
      const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظ…ظپطھط§ط­ API
      if (!validateApiKey(selectedProvider === AI_PROVIDERS.OPENAI ? 'OPENAI' : 'GEMINI')) {
        logger.error(`API key for ${selectedProvider.name} is not configured`);
        return NextResponse.json(
          { error: `ظ…ظپطھط§ط­ API ظ„ظ€ ${selectedProvider.name} ط؛ظٹط± ظ…ظ‡ظٹط£. ظٹط±ط¬ظ‰ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ظپط±ظٹظ‚ ط§ظ„ط¯ط¹ظ… ظ„ط¥ط¶ط§ظپط© ظ…ظپطھط§ط­ API طµط§ظ„ط­.` },
          { status: 500 }
        );
      }

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظ…ظپطھط§ط­ YouTube API ط¥ط°ط§ ظƒط§ظ† ظ…ط·ظ„ظˆط¨ظ‹ط§
      if ((!platform || platform.toLowerCase().includes("youtube") || platform.toLowerCase().includes("ظٹظˆطھظٹظˆط¨")) && !YOUTUBE_API_KEY) {
        logger.error("YouTube API key is not configured");
        return NextResponse.json(
          { error: "ظ…ظپطھط§ط­ YouTube API ط؛ظٹط± ظ…ظ‡ظٹط£. ظٹط±ط¬ظ‰ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ظپط±ظٹظ‚ ط§ظ„ط¯ط¹ظ…." },
          { status: 500 }
        );
      }

      // ط§ظ„ط¨ط­ط« ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط­ظ„ظٹط© ط£ظˆظ„ط§ظ‹
      let localTeachers: unknown[] = [];
      try {
        localTeachers = await prisma.teacher.findMany({
          where: {
            subject: subject as string,
          }
        });
      } catch (dbError) {
        logger.error("Error fetching teachers from database:", dbError);
        // ط§ط³طھظ…ط± ط­طھظ‰ ظ„ظˆ ظپط´ظ„ ط§ظ„ط¨ط­ط« ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
      }

      // ط¥ظ†ط´ط§ط، ط±ط³ط§ظ„ط© ط§ظ„ظ†ط¸ط§ظ… ظ„طھظˆط¬ظٹظ‡ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ظ„ظ„ط¨ط­ط« ط¹ظ† ظ…ط¯ط±ط³ظٹظ†
      const systemPrompt = `ط£ظ†طھ ظ…ط³ط§ط¹ط¯ ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ ظ…طھط®طµطµ ظپظٹ ط§ظ„ط¨ط­ط« ط¹ظ† ط§ظ„ظ…ط¯ط±ط³ظٹظ† ظˆط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„طھط¹ظ„ظٹظ…ظٹ ط§ظ„ظ…طµط±ظٹ ظ„ظ…ظ†طµط© ط«ظ†ط§ظˆظٹ.
    ظ…ظ‡ظ…طھظƒ ظ‡ظٹ ط§ظ„ط¨ط­ط« ط¹ظ† ط£ظپط¶ظ„ ظ…ط¯ط±ط³ظٹظ† ظˆظ…طµط§ط¯ط± طھط¹ظ„ظٹظ…ظٹط© ظ„ظ…ط§ط¯ط© ${subject} ${keywords ? `ظ…ط¹ ط§ظ„طھط±ظƒظٹط² ط¹ظ„ظ‰: ${keywords}` : ''}.
    ${platform ? `ظ…ط¹ ط§ظ„طھط±ظƒظٹط² ط¹ظ„ظ‰ ظ…ظ†طµط©: ${platform}` : ''}

    ظ‚ظ… ط¨طھظˆظپظٹط± ظ‚ط§ط¦ظ…ط© ظ…ظ† 5-10 ظ…ط¯ط±ط³ظٹظ† ط£ظˆ ظ‚ظ†ظˆط§طھ طھط¹ظ„ظٹظ…ظٹط© ظ…طµط±ظٹط© ظ…ط¹ظ„ظˆظ…ط§طھظ‡ظ… ظƒط§ظ„طھط§ظ„ظٹ:
    1. ط§ط³ظ… ط§ظ„ظ…ط¯ط±ط³ ط£ظˆ ط§ظ„ظ‚ظ†ط§ط©
    2. ط§ظ„ظ…ط§ط¯ط© ط§ظ„طھظٹ ظٹط¯ط±ط³ظ‡ط§
    3. ط±ط§ط¨ط· ط§ظ„ظ‚ظ†ط§ط© ط£ظˆ ط§ظ„ظ…ظ„ظپ ط§ظ„ط´ط®طµظٹ
    4. ظˆطµظپ ظ…ظˆط¬ط² ظ„ط£ط³ظ„ظˆط¨ ط§ظ„طھط¯ط±ظٹط³ ظˆط§ظ„ظ…ط­طھظˆظ‰
    5. طھظ‚ظٹظٹظ… طھظ‚ط±ظٹط¨ظٹ (ظ…ظ† 1 ط¥ظ„ظ‰ 5)

    ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط¬ظ…ظٹط¹ ط§ظ„ط±ظˆط§ط¨ط· ظ„ظ…طµط§ط¯ط± ظ…طµط±ظٹط© ط­ظ‚ظٹظ‚ظٹط© ظˆظ…ظˆط«ظˆظ‚ط©.
    ظ‚ظ… ط¨طھظ†ط³ظٹظ‚ ط§ظ„ط¥ط¬ط§ط¨ط© ظƒظ€ JSON ظ…ط¹ ط§ظ„ظ…طµظپظˆظپط§طھ ط§ظ„طھط§ظ„ظٹط©:
    {
      "teachers": [
        {
          "name": "ط§ط³ظ… ط§ظ„ظ…ط¯ط±ط³ ط£ظˆ ط§ظ„ظ‚ظ†ط§ط©",
          "subject": "ط§ظ„ظ…ط§ط¯ط©",
          "url": "ط±ط§ط¨ط· ط§ظ„ظ‚ظ†ط§ط© ط£ظˆ ط§ظ„ظ…ظ„ظپ ط§ظ„ط´ط®طµظٹ",
          "description": "ظˆطµظپ ظ…ظˆط¬ط²",
          "rating": 4.5
        }
      ]
    }`;

      let aiTeachers: any[] = [];
      let youtubeResults: any[] = [];

      // ط¥ط°ط§ ظƒط§ظ† ط·ظ„ط¨ ط§ظ„ط¨ط­ط« ظٹط´ظ…ظ„ ط§ظ„ظٹظˆطھظٹط¨طŒ ظ‚ظ… ط¨ط§ظ„ط¨ط­ط« ظ‡ظ†ط§ظƒ ط£ظٹط¶ط§ظ‹
      if (!platform || platform.toLowerCase().includes("youtube") || platform.toLowerCase().includes("ظٹظˆطھظٹظˆط¨")) {
        const searchQuery = `${subject} ظ…ط¯ط±ط³ ظ…طµط±ظٹ ${keywords || ""}`;

        try {
          const youtubeResponse = await fetch(
            `${YOUTUBE_SEARCH_URL}?part=snippet&q=${encodeURIComponent(searchQuery)}&type=channel&key=${YOUTUBE_API_KEY}&maxResults=5`
          );

          if (youtubeResponse.ok) {
            const youtubeData = await youtubeResponse.json();
            if (youtubeData.items && Array.isArray(youtubeData.items)) {
              youtubeResults = youtubeData.items.map((item: any) => ({
                name: item.snippet.channelTitle,
                url: `https://www.youtube.com/channel/${item.snippet.channelId}`,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.default.url
              }));
            }
          }
        } catch (error) {
          logger.error("Error searching YouTube:", error);
        }
      }

      // ظ…ط¹ط§ظ„ط¬ط© ط§ط³طھط¬ط§ط¨ط© ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ
      try {
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

          if (response.ok) {
            const data = await response.json();
            const teachersContent = data.choices[0].message.content;

            try {
              const teachersData = JSON.parse(teachersContent);
              aiTeachers = teachersData.teachers || [];

              // ط­ظپط¸ ط§ظ„ظ…ط¯ط±ط³ظٹظ† ط§ظ„ط¬ط¯ط¯ ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
              for (const teacher of aiTeachers) {
                try {
                  await prisma.teacher.upsert({
                    where: {
                      // ط§ط³طھط®ط¯ط§ظ… ط§ط³ظ… ط§ظ„ظ…ط¯ط±ط³ ظˆط§ظ„ظ…ط§ط¯ط© ظƒظ…ظپطھط§ط­ ظپط±ظٹط¯
                      name_subject: {
                        name: teacher.name,
                        subject: teacher.subject
                      }
                    },
                    update: {
                      onlineUrl: teacher.url,
                      rating: teacher.rating,
                      notes: teacher.description
                    },
                    create: {
                      name: teacher.name,
                      subject: teacher.subject,
                      onlineUrl: teacher.url,
                      rating: teacher.rating,
                      notes: teacher.description
                    }
                  });
                } catch (dbError) {
                  logger.error("Error saving teacher to database:", dbError);
                }
              }
            } catch (parseError) {
              logger.error("Error parsing teachers JSON:", parseError);
            }
          }
        }
      } catch (aiError) {
        logger.error("Error with AI provider:", aiError);
        // ط§ط³طھظ…ط± ط­طھظ‰ ظ„ظˆ ظپط´ظ„ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ
      }

      // ط¯ظ…ط¬ ط§ظ„ظ†طھط§ط¦ط¬ ظ…ظ† ط§ظ„ظ…طµط§ط¯ط± ط§ظ„ظ…ط®طھظ„ظپط©
      // ط§ظ„طھط£ظƒط¯ ظ…ظ† ط£ظ† ط¬ظ…ظٹط¹ ط§ظ„ظ…طµظپظˆظپط§طھ ظ…ظˆط¬ظˆط¯ط©
      const result = {
        localTeachers: localTeachers || [],
        aiTeachers: aiTeachers || [],
        youtubeResults: youtubeResults || [],
        message: "طھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظ‚ط§ط¦ظ…ط© ط§ظ„ظ…ط¯ط±ط³ظٹظ† ط¨ظ†ط¬ط§ط­",
        provider: selectedProvider.name
      };

      return NextResponse.json(result);
    } catch (error) {
      logger.error("Error in AI teachers search API:", error);
      let errorMessage = "ط­ط¯ط« ط®ط·ط£ ظپظٹ ظ…ط¹ط§ظ„ط¬ط© ط·ظ„ط¨ظƒ";

      // طھط­ط¯ظٹط¯ ط±ط³ط§ظ„ط© ط§ظ„ط®ط·ط£ ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ظ†ظˆط¹ ط§ظ„ط®ط·ط£
      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          errorMessage = "ظ…ظپطھط§ط­ API ظ„ظ€ Google Gemini ط؛ظٹط± ظ…ظ‡ظٹط£. ظٹط±ط¬ظ‰ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ظپط±ظٹظ‚ ط§ظ„ط¯ط¹ظ….";
        } else if (error.message.includes("fetch")) {
          errorMessage = "ظپط´ظ„ ط§ظ„ط§طھطµط§ظ„ ط¨ط®ط¯ظ…ط© ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.";
        }
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
}