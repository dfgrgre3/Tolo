import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(request: NextRequest) {
  // 检查API密钥是否已配置
  if (!API_KEY) {
    console.error("OpenAI API key is not configured");
    return NextResponse.json(
      { error: "OpenAI API key is not configured. Please contact support." },
      { status: 500 }
    );
  }

  try {
    const { subject, grade, lesson, difficulty, questionCount } = await request.json();
    
    if (!subject || !grade || !lesson) {
      return NextResponse.json(
        { error: "يرجى تقديم المادة والسنة الدراسية والدرس" },
        { status: 400 }
      );
    }

    const systemMessage = {
      role: "system",
      content: "أنت مساعد ذكاء اصطناعي متخصص في إنشاء الامتحانات التعليمية للمنهج المصري. قم بإنشاء امتحانات متنوعة تشمل أسئلة موضوعية وأسئلة صح وخطأ وأسئلة إجابة قصيرة. يجب أن تكون الأسئلة مناسبة للمستوى الدراسي المحدد وتغطي الدرس المطلوب بشكل شامل."
    };

    const userMessage = {
      role: "user",
      content: `أنشئ امتحاناً لمادة ${subject} للصف ${grade} في درس ${lesson} ${difficulty ? `بمستوى صعوبة ${difficulty}` : ""}. ${questionCount ? `الامتحان يجب أن يحتوي على ${questionCount} أسئلة` : "الامتحان يجب أن يحتوي على عدد مناسب من الأسئلة"}. قم بتنسيق الامتحان كالتالي:

1. عنوان الامتحان
2. التعليمات
3. الأسئلة مقسمة حسب النوع (اختيار من متعدد، صح وخطأ، إجابة قصيرة)
4. مفتاح الإجابة في نهاية الامتحان`
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
        max_tokens: 2000
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
    const examContent = data.choices[0].message.content;

    return NextResponse.json({ examContent });
  } catch (error) {
    console.error("Error in exam generation API:", error);
    return NextResponse.json(
      { error: "حدث خطأ في معالجة طلبك" },
      { status: 500 }
    );
  }
}