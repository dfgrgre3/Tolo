import { NextRequest } from "next/server";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { handleApiError, successResponse, createErrorResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    // تحقق من تهيئة مفتاح API
    if (!API_KEY) {
      logger.error("مفتاح OpenAI API غير مضبوط");
      return createErrorResponse("مفتاح OpenAI API غير مضبوط. يرجى التواصل مع الدعم.", 500);
    }

    try {
      const { subject, grade, topic, studentChallenges } = await req.json();

      const systemMessage = {
        role: "system",
        content: "أنت خبير تربوي متخصص في تقديم النصائح التعليمية للطلاب في المنهج المصري. قدم نصائح عملية وفعالة بناءً على المادة الدراسية والصف الدراسي والموضوع المحدد. إذا تم ذكر تحديات يواجهها الطالب، ركز على تقديم حلول لهذه التحديات."
      };

      let userMessageContent = "قدم نصائح تعليمية";

      if (subject) {
        userMessageContent += ` لمادة ${subject}`;
      }

      if (grade) {
        userMessageContent += ` للصف ${grade}`;
      }

      if (topic) {
        userMessageContent += ` في موضوع ${topic}`;
      }

      if (studentChallenges) {
        userMessageContent += `. الطالب يواجه التحديات التالية: ${studentChallenges}`;
      }

      userMessageContent += ". قدم النصائح في شكل نقاط واضحة ومفصلة، مع شرح كيفية تطبيق كل نصيحة عملياً.";

      const userMessage = {
        role: "user",
        content: userMessageContent
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [systemMessage, userMessage],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error("Error from OpenAI:", errorData);

        return createErrorResponse("عذراً، يواجه النظام بعض الصعوبات التقنية حالياً. يرجى المحاولة مرة أخرى لاحقاً.", 500);
      }

      const data = await response.json();
      const tipsContent = data.choices[0].message.content;

      return successResponse({ tipsContent });
    } catch (error) {
      logger.error("Error in tips generation API:", error);
      return handleApiError(error);
    }
  });
}