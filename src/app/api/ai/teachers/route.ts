import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

import { logger } from '@/lib/logger';

// 8?7?7?8!7? 7?7?8&7?7? 7?7?7?8y87?7? 7?88y8?7?8y7? 887?7?7? 7?8  7?888 8?7?7? 7?87?7?88y8&8y7?
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { subject, keywords, platform, provider } = await req.json();

      if (!subject) {
        return NextResponse.json(
          { error: "7?87?7?7?7 7?8?8~8y7? 7?88&7?7?7? 7?87?7?7?7?8y7?" },
          { status: 400 }
        );
      }

      // 7?7?7?8y7? 8&87?8& 7?87?7?8&7?
      const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

      // 7?87?7?88 8&8  8&8~7?7?7? API
      if (!validateApiKey(selectedProvider === AI_PROVIDERS.OPENAI ? 'OPENAI' : 'GEMINI')) {
        logger.error(`API key for ${selectedProvider.name} is not configured`);
        return NextResponse.json(
          { error: `8&8~7?7?7? API 88? ${selectedProvider.name} 78y7? 8&8!8y7?. 8y7?7?80 7?87?8?7?7?8 8&7? 8~7?8y8 7?87?7?8& 87?7?7?8~7? 8&8~7?7?7? API 7?7?87?.` },
          { status: 500 }
        );
      }

      // 7?87?7?88 8&8  8&8~7?7?7? YouTube API 7?7?7? 8?7?8  8&7?88?7?897?
      if ((!platform || platform.toLowerCase().includes("youtube") || platform.toLowerCase().includes("يوتيوب")) && !YOUTUBE_API_KEY) {
        logger.error("YouTube API key is not configured");
        return NextResponse.json(
          { error: "8&8~7?7?7? YouTube API 78y7? 8&8!8y7?. 8y7?7?80 7?87?8?7?7?8 8&7? 8~7?8y8 7?87?7?8&." },
          { status: 500 }
        );
      }

      // 7?87?7?7? 8~8y 87?7?7?7? 7?87?8y7?8 7?7? 7?88&7?88y7? 7?8?87?89
      let localTeachers: unknown[] = [];
      try {
        localTeachers = await prisma.teacher.findMany({
          where: {
            subjectId: subject as string,
          },
          include: {
            subject: true
          }
        });
      } catch (dbError) {
        logger.error("Error fetching teachers from database:", dbError);
        // 7?7?7?8&7? 7?7?80 88? 8~7?8 7?87?7?7? 8~8y 87?7?7?7? 7?87?8y7?8 7?7?
      }

      // 7?8 7?7?7 7?7?7?87? 7?88 7?7?8& 87?8?7?8y8! 7?87?8?7?7 7?87?7?7?8 7?7?8y 887?7?7? 7?8  8&7?7?7?8y8 
      const systemPrompt = `7?8 7? 8&7?7?7?7? 7?8?7?7 7?7?7?8 7?7?8y 8&7?7?7?7? 8~8y 7?87?7?7? 7?8  7?88&7?7?7?8y8  8?7?88&7?7?8?80 7?87?7?88y8&8y 7?88&7?7?8y 88&8 7?7? 7?8 7?8?8y.
    8&8!8&7?8? 8!8y 7?87?7?7? 7?8  7?8~7?8 8&7?7?7?8y8  8?8&7?7?7?7? 7?7?88y8&8y7? 88&7?7?7? ${subject} ${keywords ? `8&7? 7?87?7?8?8y7? 7?880: ${keywords}` : ''}.
    ${platform ? `8&7? 7?87?7?8?8y7? 7?880 8&8 7?7?: ${platform}` : ''}

    88& 7?7?8?8~8y7? 87?7?8&7? 8&8  5-10 8&7?7?7?8y8  7?8? 88 8?7?7? 7?7?88y8&8y7? 8&7?7?8y7? 8&7?88?8&7?7?8!8& 8?7?87?7?88y:
    1. 7?7?8& 7?88&7?7?7? 7?8? 7?888 7?7?
    2. 7?88&7?7?7? 7?87?8y 8y7?7?7?8!7?
    3. 7?7?7?7? 7?888 7?7? 7?8? 7?88&88~ 7?87?7?7?8y
    4. 8?7?8~ 8&8?7?7? 87?7?88?7? 7?87?7?7?8y7? 8?7?88&7?7?8?80
    5. 7?88y8y8& 7?87?8y7?8y (8&8  1 7?880 5)

    8y7?7? 7?8  7?8?8?8  7?8&8y7? 7?87?8?7?7?7? 88&7?7?7?7? 8&7?7?8y7? 7?88y88y7? 8?8&8?7?8?87?.
    88& 7?7?8 7?8y8 7?87?7?7?7?7? 8?8? JSON 8&7? 7?88&7?8~8?8~7?7? 7?87?7?88y7?:
    {
      "teachers": [
        {
          "name": "7?7?8& 7?88&7?7?7? 7?8? 7?888 7?7?",
          "subject": "7?88&7?7?7?",
          "url": "7?7?7?7? 7?888 7?7? 7?8? 7?88&88~ 7?87?7?7?8y",
          "description": "8?7?8~ 8&8?7?7?",
          "rating": 4.5
        }
      ]
    }`;

      let aiTeachers: any[] = [];
      let youtubeResults: any[] = [];

      // 7?7?7? 8?7?8  7?87? 7?87?7?7? 8y7?8&8 7?88y8?7?8y7?7R 88& 7?7?87?7?7? 8!8 7?8? 7?8y7?7?89
      if (!platform || platform.toLowerCase().includes("youtube") || platform.toLowerCase().includes("يوتيوب")) {
        const searchQuery = `${subject} 8&7?7?7? 8&7?7?8y ${keywords || ""}`;

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

      // 8&7?7?87?7? 7?7?7?7?7?7?7? 7?87?8?7?7 7?87?7?7?8 7?7?8y
      try {
        if (selectedProvider === AI_PROVIDERS.OPENAI) {
          // 7?7?7?7?7?7?8& OpenAI API
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

              // 7?8~7? 7?88&7?7?7?8y8  7?87?7?7? 8~8y 87?7?7?7? 7?87?8y7?8 7?7?
              for (const teacher of aiTeachers) {
                try {
                  await prisma.teacher.upsert({
                    where: {
                      // 7?7?7?7?7?7?8& 7?7?8& 7?88&7?7?7? 8?7?88&7?7?7? 8?8&8~7?7?7? 8~7?8y7?
                      name_subject: {
                        name: teacher.name,
                        subjectId: teacher.subjectId || teacher.subject
                      }
                    },
                    update: {
                      onlineUrl: teacher.url,
                      rating: teacher.rating,
                      notes: teacher.description
                    },
                    create: {
                      name: teacher.name,
                      subjectId: teacher.subjectId || teacher.subject,
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
        // 7?7?7?8&7? 7?7?80 88? 8~7?8 7?87?8?7?7 7?87?7?7?8 7?7?8y
      }

      // 7?8&7? 7?88 7?7?7?7? 8&8  7?88&7?7?7?7? 7?88&7?7?88~7?
      // 7?87?7?8?7? 8&8  7?8  7?8&8y7? 7?88&7?8~8?8~7?7? 8&8?7?8?7?7?
      const result = {
        localTeachers: localTeachers || [],
        aiTeachers: aiTeachers || [],
        youtubeResults: youtubeResults || [],
        message: "7?8& 7?87?7?8?7? 7?880 87?7?8&7? 7?88&7?7?7?8y8  7?8 7?7?7?",
        provider: selectedProvider.name
      };

      return NextResponse.json(result);
    } catch (error) {
      logger.error("Error in AI teachers search API:", error);
      let errorMessage = "7?7?7? 7?7?7? 8~8y 8&7?7?87?7? 7?87?8?";

      // 7?7?7?8y7? 7?7?7?87? 7?87?7?7? 7?8 7?789 7?880 8 8?7? 7?87?7?7?
      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          errorMessage = "8&8~7?7?7? API 88? Google Gemini 78y7? 8&8!8y7?. 8y7?7?80 7?87?8?7?7?8 8&7? 8~7?8y8 7?87?7?8&.";
        } else if (error.message.includes("fetch")) {
          errorMessage = "8~7?8 7?87?7?7?7?8 7?7?7?8&7? 7?87?8?7?7 7?87?7?7?8 7?7?8y. 8y7?7?80 7?88&7?7?8?87? 8&7?7? 7?7?7?80 87?7?87?89.";
        }
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
}