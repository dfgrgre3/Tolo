import { NextRequest, NextResponse } from "next/server";
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { analyzeSentiment } from "@/lib/ai/sentiment-analysis";
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  parseRequestBody,
  createStandardErrorResponse,
  createSuccessResponse,
  addSecurityHeaders
} from '@/lib/api-utils';
import { AIService } from "@/lib/ai/ai-service";

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Parse request body with timeout protection using standardized helper
      const bodyResult = await parseRequestBody<{
        messages?: { role: string; content: string }[];
        provider?: string;
        userId?: string;
      }>(req, {
        maxSize: 10240, // 10KB max for chat messages
        required: true,
      });

      if (!bodyResult.success) {
        return bodyResult.error;
      }

      const { messages, provider, userId } = bodyResult.data;

      // Try to get userId from token if not provided
      let actualUserId = userId;
      if (!actualUserId) {
        // Auth removed
      }

      // تحديد مقدم الخدمة باستخدام الدالة الافتراضية مع السماح بالتغيير من الطلب
      let providerKey = 'OPENROUTER'; // الافتراضي هو OpenRouter كما طلب المستخدم
      
      if (provider === 'openai') {
        providerKey = 'OPENAI';
      } else if (provider === 'gemini') {
        providerKey = 'GEMINI';
      } else if (provider === 'openrouter') {
        providerKey = 'OPENROUTER';
      } else {
        // إذا لم يتم تحديد مزود، نستخدم الافتراضي من الإعدادات
        const defaultProv = getDefaultProvider();
        if (defaultProv === AI_PROVIDERS.OPENAI) providerKey = 'OPENAI';
        else if (defaultProv === AI_PROVIDERS.GEMINI) providerKey = 'GEMINI';
        else providerKey = 'OPENROUTER';
      }

      const selectedProvider = AI_PROVIDERS[providerKey];

      if (!validateApiKey(providerKey)) {
        const response = NextResponse.json(
          { error: `مفتاح API لـ ${selectedProvider.name} غير مهيأ`, code: 'API_KEY_MISSING' },
          { status: 500 }
        );
        return addSecurityHeaders(response);
      }

      if (!messages || !Array.isArray(messages)) {
        const response = NextResponse.json(
          { error: "الرسائل غير صالحة", code: 'INVALID_MESSAGES' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Analyze sentiment of the last user message
      let sentiment = null;
      let sentimentAwareContext = "";

      if (actualUserId && messages.length > 0) {
        const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
        if (lastUserMessage) {
          try {
            sentiment = await analyzeSentiment(lastUserMessage.content, actualUserId, 'chat');

            // Add sentiment-aware context
            if (sentiment.sentiment === 'frustrated' || sentiment.sentiment === 'tired') {
              sentimentAwareContext = `ملاحظة مهمة: المستخدم يبدو ${sentiment.sentiment === 'frustrated' ? 'محبطاً' : 'متعباً'}. يجب أن تكون أكثر تفهماً وتقديم دعم إضافي. `;
              if (sentiment.suggestions && sentiment.suggestions.length > 0) {
                sentimentAwareContext += `اقتراحات الدعم: ${sentiment.suggestions.join(', ')}. `;
              }
            }

            // Save chat message with sentiment
            await prisma.aiChatMessage.create({
              data: {
                userId: actualUserId,
                role: 'user',
                content: lastUserMessage.content,
                sentiment: sentiment.sentiment,
                metadata: JSON.stringify({
                  score: sentiment.score,
                  confidence: sentiment.confidence,
                  emotions: sentiment.emotions
                })
              }
            });
          } catch (error) {
            logger.error('Error analyzing sentiment:', error);
          }
        }
      }

      // إضافة رسالة النظام لتعريف شخصية المساعد مع تحليل المشاعر
      const systemMessage = `${sentimentAwareContext}أنت مساعد ذكاء اصطناعي متخصص في التعليم والإرشاد الأكاديمي لمنصة تولو. مهمتك هي مساعدة الطلاب في دراستهم والإجابة على أسئلتهم بطريقة واضحة ومفيدة. يجب أن تكون إجاباتك دقيقة ومتناسبة مع المستوى التعليمي للطالب. إذا لم تكن متأكداً من إجابة سؤال ما، فمن الأفضل أن تعترف بذلك بدلاً من تقديم معلومات خاطئة. كن دائماً داعماً ومشجعاً، خاصة إذا كان المستخدم يبدو محبطاً أو متعباً.`;

      const aiMessage = await AIService.call(
        messages.map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content
        })),
        {
          provider: providerKey,
          systemMessage,
          temperature: 0.7,
          maxTokens: 1000
        }
      );

      // Save assistant message if userId exists
      if (actualUserId) {
        await prisma.aiChatMessage.create({
          data: {
            userId: actualUserId,
            role: 'assistant',
            content: aiMessage,
            metadata: JSON.stringify({
              provider: selectedProvider.name,
              sentiment: sentiment?.sentiment || null
            })
          }
        });
      }

      return createSuccessResponse({
        message: aiMessage,
        sentiment: sentiment ? {
          sentiment: sentiment.sentiment,
          score: sentiment.score,
          suggestions: sentiment.suggestions
        } : null
      });
    } catch (error) {
      logger.error("Error in AI chat API:", error);
      return createStandardErrorResponse(
        error,
        "حدث خطأ في معالجة طلبك"
      );
    }
  });
}
