import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(request: NextRequest) {
  // Check if API key is configured
  if (!API_KEY) {
    console.error("OpenAI API key is not configured");
    return NextResponse.json(
      { error: "OpenAI API key is not configured. Please contact support." },
      { status: 500 }
    );
  }

  try {
    const { subject, grade, platform } = await request.json();
    
    if (!subject) {
      return NextResponse.json(
        { error: "يرجى تحديد المادة الدراسية" },
        { status: 400 }
      );
    }

    const systemMessage = {
      role: "system",
      content: "أنت مساعد ذكاء اصطناعي متخصص في البحث عن أفضل المدرسين المصريين على المنصات التعليمية مثل يوتيوب ومدرستي وغيرها. قدم معلومات دقيقة عن أشهر المدرسين في المادة المطلوبة، مع ذكر المنصات التي يمكن العثور عليهم فيها، وروابط قنواتهم أو صفحاتهم إن أمكن."
    };

    let userMessageContent = `ابحث عن أفضل المدرسين المصريين لمادة ${subject}`;
    
    if (grade) {
      userMessageContent += ` للصف ${grade}`;
    }
    
    if (platform) {
      userMessageContent += ` على منصة ${platform}`;
    } else {
      userMessageContent += " على مختلف المنصات التعليمية مثل يوتيوم ومدرستي وغيرها";
    }
    
    userMessageContent += ". قدم المعلومات في شكل قائمة تحتوي على اسم المدرس، المنصة، ومميزات شرحه، وروابط للوصول إلى محتواه التعليمي إن أمكن.";

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
    const teachersContent = data.choices[0].message.content;

    return NextResponse.json({ teachersContent });
  } catch (error) {
    console.error("Error in teachers search API:", error);
    return NextResponse.json(
      { error: "حدث خطأ في معالجة طلبك" },
      { status: 500 }
    );
  }
}