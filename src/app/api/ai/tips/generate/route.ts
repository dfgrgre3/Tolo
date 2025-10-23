import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(request: NextRequest) {
  // تحقق من تهيئة مفتاح API
  if (!API_KEY) {
    console.error("مفتاح OpenAI API غير مضبوط");
    return NextResponse.json(
      { error: "مفتاح OpenAI API غير مضبوط. يرجى التواصل مع الدعم." },
      { status: 500 }
    );
  }

  try {
    const { subject, grade, topic, studentChallenges } = await request.json();
    
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
      console.error("Error from OpenAI:", errorData);
      
      return NextResponse.json({
        error: "عذراً، يواجه النظام بعض الصعوبات التقنية حالياً. يرجى المحاولة مرة أخرى لاحقاً."
      }, { status: 500 });
    }

    const data = await response.json();
    const tipsContent = data.choices[0].message.content;

    return NextResponse.json({ tipsContent });
  } catch (error) {
    console.error("Error in tips generation API:", error);
    return NextResponse.json(
      { error: "حدث خطأ في معالجة طلبك" },
      { status: 500 }
    );
  }
}