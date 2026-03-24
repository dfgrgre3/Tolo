import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { AI_PROVIDERS, getDefaultProvider } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, createErrorResponse } from '@/lib/api-utils';

import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { userId, subject, studyGoal, challenges, currentGrade, provider } = await req.json();

      // 7?7?7?8y7? 8&87?8& 7?87?7?8&7?
      const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

      if (!selectedProvider.apiKey) {
        return createErrorResponse(`مفتاح API لـ ${selectedProvider.name} غير مهيأ`, 500);
      }

      // 7?87?7?8?8 7?880 7?8y7?8 7?7? 7?88&7?7?7?7?8& 7?7?7? 7?8& 7?8?8~8y7? 8&7?7?8~ 7?88&7?7?7?7?8&
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

      // 7?8 7?7?7 7?7?7?87? 7?88 7?7?8& 87?8?7?8y8! 7?87?8?7?7 7?87?7?7?8 7?7?8y 87?87?8y8& 7?88 7?7?7?7?
      const systemPrompt = `7?8 7? 8&7?7?7?7? 7?8?7?7 7?7?7?8 7?7?8y 8&7?7?7?7? 8~8y 7?87?7?7?7?7? 7?87?8?7?7?8y8&8y 88&8 7?7? 7?8 7?8?8y.
    8&8!8&7?8? 8!8y 7?87?8y8& 8 7?7?7?7? 7?7?88y8&8y7? 8&7?7?7?7? 8?8~7?7?87? 887?7?87?.

    8&7?88?8&7?7? 7?87?7?87?:
    ${userData ? `
    - 7?87?7?8&: ${userData.name || "78y7? 8&7?7?7?"}
    - 7?88&8?7?7? 7?88&7?7?87?: ${userData.subjectEnrollments?.map((s) => s.subjectId).join(", ") || "87? 7?8?7?7? 8&8?7?7? 8&7?7?87?"}
    - 8&7?8?7?7? 7?7?7?7?7? 7?87?8&7?7?7?8 7?7? 7?87?7?8y7?7?: ${userData.examResults && userData.examResults.length > 0 ? (userData.examResults.reduce((sum: number, exam) => sum + exam.score, 0) / userData.examResults.length).toFixed(2) : "87? 7?8?7?7? 7?8y7?8 7?7?"}
    - 8&7?8?7?7? 8?87? 7?87?7?7?7?7? 7?87?7?7?8?7?8y: ${userData.progressSnapshots && userData.progressSnapshots.length > 0 ? (userData.progressSnapshots.reduce((sum: number, p) => sum + p.totalStudyMinutes, 0) / userData.progressSnapshots.length / 60).toFixed(2) + " 7?7?7?7?7?" : "87? 7?8?7?7? 7?8y7?8 7?7?"}
    ` : "87? 7?8?7?7? 7?8y7?8 7?7? 8&7?7?7?7?8& 8&7?7?7?7?"}

    7?87? 7?88 7?7?7?7?:
    ${subject ? `- 7?88&7?7?7?: ${subject}` : ""}
    ${studyGoal ? `- 7?88!7?8~ 7?87?7?7?7?8y: ${studyGoal}` : ""}
    ${challenges ? `- 7?87?7?7?8y7?7? 7?87?8y 8y8?7?7?8!8!7? 7?87?7?87?: ${challenges}` : ""}
    ${currentGrade ? `- 7?88&7?7?8?80 7?87?7?7?7?8y 7?87?7?88y: ${currentGrade}` : ""}

    88& 7?7?87?8y8& 8 7?7?7?7? 7?8&88y7? 8?8&7?7?7?7? 7?7?8&8:
    1. 7?7?7?7?7?7?8y7?8y7?7? 7?87?7?7?7?7? 7?88~7?7?87?
    2. 8?8y8~8y7? 7?87?787? 7?880 7?87?7?7?8y7?7? 7?88&7?8?8?7?7?
    3. 8&7?7?7?7? 7?7?88y8&8y7? 8&8?7?80 7?8!7?
    4. 7?7?7? 7?7?7?7?8y7? 8&87?7?7?7?
    5. 8 7?7?7?7? 87?7?7?8y8  7?87?7?7?7 7?87?8?7?7?8y8&8y

    8y7?7? 7?8  7?8?8?8  7?88 7?7?7?7? 7?8&88y7? 8?8?7?87?8y7? 8?87?7?87? 887?7?7?8y8.
    88& 7?7?8 7?8y8 7?87?7?7?7?7? 8?8? JSON 8&7? 7?87?8 8y7? 7?87?7?88y7?:
    {
      "tips": [
        {
          "category": "7?7?7?7?7?7?8y7?8y7?7? 7?87?7?7?7?7?|7?87?787? 7?880 7?87?7?7?8y7?7?|7?88&7?7?7?7? 7?87?7?88y8&8y7?|7?87?7?7? 7?87?7?7?7?8y7?|7?7?7?8y8  7?87?7?7?7",
          "title": "7?8 8?7?8  7?88 7?8y7?7?",
          "content": "8&7?7?8?80 7?88 7?8y7?7? 7?88&8~7?8",
          "priority": "high|medium|low"
        }
      ],
      "summary": "8&87?7? 7?7?8&8 888 7?7?7?7? 7?88&87?8&7?"
    }`;

      let tipsContent = "";

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

        if (!response.ok) {
          const errorData = await response.json();
          logger.error("Error from OpenAI:", errorData);
          return createErrorResponse("عذراً، يواجه النظام بعض الصعوبات التقنية في تقديم النصائح حالياً. يرجى المحاولة مرة أخرى لاحقاً.", 500);
        }

        const data = await response.json();
        tipsContent = data.choices[0].message.content;
      } else {
        // 7?7?7?7?7?7?8& Google Gemini API
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
          return createErrorResponse("عذراً، يواجه النظام بعض الصعوبات التقنية في تقديم النصائح حالياً. يرجى المحاولة مرة أخرى لاحقاً.", 500);
        }

        const data = await response.json();
        tipsContent = data.candidates[0].content.parts[0].text;
      }

      // 8&7?7?8?87? 7?7?88y8 7?88&7?7?8?80 8?8? JSON
      try {
        const tipsData = JSON.parse(tipsContent);

        // 7?8~7? 7?88 7?7?7?7? 8~8y 87?7?7?7? 7?87?8y7?8 7?7? 7?7?7? 8?7?8  8!8 7?8? 8&7?7?8~ 8&7?7?7?7?8&
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

        return successResponse({
          ...tipsData,
          provider: selectedProvider.name
        });
      } catch (parseError) {
        logger.error("Error parsing tips JSON:", parseError);

        // إذا فشل تحليل JSON، قم بإرجاع المحتوى الخام
        return successResponse({
          rawContent: tipsContent,
          message: "تم إنشاء النصائح ولكن حدث خطأ في تنسيقها. يرجى مراجعة المحتوى أدناه.",
          provider: selectedProvider.name
        });
      }
    } catch (error: unknown) {
      logger.error("Error in AI tips API:", error);
      return handleApiError(error);
    }
  });
}

