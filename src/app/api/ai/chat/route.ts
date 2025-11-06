import { NextRequest, NextResponse } from "next/server";
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { analyzeSentiment } from "@/lib/ai/sentiment-analysis";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth-unified";

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
  try {
    const { messages, provider, userId } = await req.json();
    
    // Try to get userId from token if not provided
    let actualUserId = userId;
    if (!actualUserId) {
      const decodedToken = verifyToken(req);
      if (decodedToken) {
        actualUserId = decodedToken.userId;
      }
    }

    // تحديد مقدم الخدمة
    const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

    if (!validateApiKey(selectedProvider === AI_PROVIDERS.OPENAI ? 'OPENAI' : 'GEMINI')) {
      return NextResponse.json(
        { error: `مفتاح API لـ ${selectedProvider.name} غير مهيأ` },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "الرسائل غير صالحة" },
        { status: 400 }
      );
    }

    // Analyze sentiment of the last user message
    let sentiment = null;
    let sentimentAwareContext = "";
    
    if (actualUserId && messages.length > 0) {
      const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
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
              metadata: {
                score: sentiment.score,
                confidence: sentiment.confidence,
                emotions: sentiment.emotions
              }
            }
          });
        } catch (error) {
          console.error('Error analyzing sentiment:', error);
        }
      }
    }

    // إضافة رسالة النظام لتعريف شخصية المساعد مع تحليل المشاعر
    const systemMessage = {
      role: "system",
      content: `${sentimentAwareContext}أنت مساعد ذكاء اصطناعي متخصص في التعليم والإرشاد الأكاديمي لمنصة ثناوي. مهمتك هي مساعدة الطلاب في دراستهم والإجابة على أسئلتهم بطريقة واضحة ومفيدة. يجب أن تكون إجاباتك دقيقة ومتناسبة مع المستوى التعليمي للطالب. إذا لم تكن متأكداً من إجابة سؤال ما، فمن الأفضل أن تعترف بذلك بدلاً من تقديم معلومات خاطئة. كن دائماً داعماً ومشجعاً، خاصة إذا كان المستخدم يبدو محبطاً أو متعباً.`
    };

    let aiMessage = "";

    if (selectedProvider === AI_PROVIDERS.OPENAI) {
      // استخدام OpenAI API
      const response = await fetch(selectedProvider.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${selectedProvider.apiKey}`
        },
        body: JSON.stringify({
          model: selectedProvider.model,
          messages: [systemMessage, ...messages],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error from OpenAI:", errorData);
        return NextResponse.json({
          message: "عذراً، يواجه المساعد الذكي بعض الصعوبات التقنية حالياً. يرجى المحاولة مرة أخرى لاحقاً أو التواصل مع فريق الدعم."
        });
      }

      const data = await response.json();
      aiMessage = data.choices[0].message.content;
    } else {
      // استخدام Google Gemini API
      const geminiMessages = [
        systemMessage,
        ...messages
      ].map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(`${selectedProvider.baseUrl}${selectedProvider.model}:generateContent?key=${selectedProvider.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          },
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error from Gemini:", errorData);
        return NextResponse.json({
          message: "عذراً، يواجه المساعد الذكي بعض الصعوبات التقنية حالياً. يرجى المحاولة مرة أخرى لاحقاً أو التواصل مع فريق الدعم."
        });
      }

      const data = await response.json();
      aiMessage = data.candidates[0].content.parts[0].text;
    }

    // Save assistant message if userId exists
    if (actualUserId) {
      await prisma.aiChatMessage.create({
        data: {
          userId: actualUserId,
          role: 'assistant',
          content: aiMessage,
          metadata: {
            provider: selectedProvider.name,
            sentiment: sentiment?.sentiment || null
          }
        }
      });
    }

    return NextResponse.json({ 
      message: aiMessage,
      sentiment: sentiment ? {
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        suggestions: sentiment.suggestions
      } : null
    });
  } catch (error) {
    console.error("Error in AI chat API:", error);
    return NextResponse.json(
      { message: "حدث خطأ في معالجة طلبك" },
      { status: 500 }
    );
  }
  });
}