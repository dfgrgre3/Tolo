import { NextRequest, NextResponse } from "next/server";
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";

export async function POST(request: NextRequest) {
  try {
    const { messages, provider } = await request.json();

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

    // إضافة رسالة النظام لتعريف شخصية المساعد
    const systemMessage = {
      role: "system",
      content: "أنت مساعد ذكاء اصطناعي متخصص في التعليم والإرشاد الأكاديمي لمنصة ثناوي. مهمتك هي مساعدة الطلاب في دراستهم والإجابة على أسئلتهم بطريقة واضحة ومفيدة. يجب أن تكون إجاباتك دقيقة ومتناسبة مع المستوى التعليمي للطالب. إذا لم تكن متأكداً من إجابة سؤال ما، فمن الأفضل أن تعترف بذلك بدلاً من تقديم معلومات خاطئة."
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

    return NextResponse.json({ message: aiMessage });
  } catch (error) {
    console.error("Error in AI chat API:", error);
    return NextResponse.json(
      { message: "حدث خطأ في معالجة طلبك" },
      { status: 500 }
    );
  }
}