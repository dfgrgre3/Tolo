import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { AI_PROVIDERS } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, createErrorResponse } from '@/lib/api-utils';

import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { userId, subject, studyGoal, challenges, currentGrade, provider } = await req.json();

      // تحديد المزود
      const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

      if (!selectedProvider.apiKey) {
        return createErrorResponse(`مفتاح API لـ ${selectedProvider.name} غير مهيأ`, 500);
      }

      // جلب بيانات المستخدم لتخصيص النصيحة
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

      // بناء نص المطالبة
      const systemPrompt = `أنت خبير تعليمي متخصص في مساعدة الطلاب المصريين بنظام الثانوية العامة.
    قدم نصائح دراسية وخطط عمل مخصصة بناءً على المعطيات التالية.

    بيانات الطالب الحالية:
    ${userData ? `
    - اسم الطالب: ${userData.name || "طالب غير مسمى"}
    - المواد المشترك بها: ${userData.subjectEnrollments?.map((s: any) => s.subjectId).join(", ") || "لا توجد بيانات"}
    - نتائج الامتحانات الأخيرة: ${userData.examResults && userData.examResults.length > 0 ? (userData.examResults.reduce((sum: number, exam: any) => sum + exam.score, 0) / userData.examResults.length).toFixed(2) : "لا توجد نتائج"}
    - متوسط دقائق المذاكرة الأخيرة: ${userData.progressSnapshots && userData.progressSnapshots.length > 0 ? (userData.progressSnapshots.reduce((sum: number, p: any) => sum + p.totalStudyMinutes, 0) / userData.progressSnapshots.length / 60).toFixed(2) + " ساعة" : "لا توجد نتائج"}
    ` : "طالب جديد لم يقم بأي نشاط بعد"}

    الموضوع أو المشكلة الحالية:
    ${subject ? `- المادة: ${subject}` : ""}
    ${studyGoal ? `- الهدف الدراسي: ${studyGoal}` : ""}
    ${challenges ? `- التحديات التي يواجهها الطالب: ${challenges}` : ""}
    ${currentGrade ? `- المستوى الحالي للطالب: ${currentGrade}` : ""}

    يجب أن تكون النصيحة عملية وتشمل:
    1. نصائح تقنية للمادة المذكورة
    2. كيفية إدارة الوقت بناءً على التحديات المذكورة
    3. استراتيجيات مراجعة فعالة
    4. تشجيع ودعم نفسي
    5. خطوات عملية فورية للتطبيق

    اجعل الرد بصيغة JSON حصراً بهذا التنسيق:
    {
      "tips": [
        {
          "category": "نصائح موضوعية|إدارة الوقت|استراتيجيات|تحفيز|خطوات عملية",
          "title": "عنوان النصيحة",
          "content": "محتوى النصيحة المفصل",
          "priority": "high|medium|low"
        }
      ],
      "summary": "ملخص عام للحالة والخطوات القادمة"
    }`;

      let tipsContent = "";

      if (selectedProvider === AI_PROVIDERS.OPENAI) {
        // الاتصال بـ OpenAI API
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
        // الاتصال بـ Google Gemini API
        const response = await fetch(`${selectedProvider.baseUrl}${selectedProvider.model}:generateContent?key=${selectedProvider.apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
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
              maxOutputTokens: 4000
            }
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

      // تحليل النتيجة وحف٪ا
      try {
        const tipsData = JSON.parse(tipsContent);

        // حفظ النصائح في قاعدة البيانات لإبقاء سجل للتلميحات الممنوحة
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