import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";

export async function POST(request: NextRequest) {
  try {
    const { subject, year, lesson, difficulty, questionCount, provider } = await request.json();

    if (!subject || !year || !lesson) {
      return NextResponse.json(
        { error: "الرجاء توفير المادة والسنة الدراسية والدرس" },
        { status: 400 }
      );
    }

    // تحديد عدد الأسئلة الافتراضي إذا لم يتم تحديده
    const numQuestions = questionCount || 10;

    // تحديد مقدم الخدمة
    const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

    if (!validateApiKey(selectedProvider === AI_PROVIDERS.OPENAI ? 'OPENAI' : 'GEMINI')) {
      return NextResponse.json(
        { error: `مفتاح API لـ ${selectedProvider.name} غير مهيأ` },
        { status: 500 }
      );
    }

    // إنشاء رسالة النظام لتوجيه الذكاء الاصطناعي لإنشاء امتحان
    const systemPrompt = `أنت مساعد ذكاء اصطناعي متخصص في إنشاء الامتحانات التعليمية لمنصة ثناوي. 
    مهمتك هي إنشاء امتحان لمادة ${subject} للسنة الدراسية ${year}، focusing على درس ${lesson}.
    ${difficulty ? `مستوى الصعوبة: ${difficulty}` : ''}
    قم بإنشاء ${numQuestions} أسئلة متنوعة (اختيار من متعدد، صح أو خطأ، إجابات قصيرة).
    لكل سؤال، قم بتوفير:
    1. نص السؤال
    2. الخيارات (لأسئلة الاختيار من متعدد)
    3. الإجابة الصحيحة
    4. شرح موجز للإجابة

    يجب أن تكون الأسئلة مناسبة للمستوى الدراسي وتغطي المفاهيم الرئيسية للدرس المحدد.
    قم بتنسيق الإجابة كـ JSON مع المصفوفات التالية:
    {
      "questions": [
        {
          "question": "نص السؤال",
          "type": "multiple_choice|true_false|short_answer",
          "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
          "correctAnswer": "الإجابة الصحيحة",
          "explanation": "شرح موجز للإجابة"
        }
      ]
    }`;

    let examContent = "";

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
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error from OpenAI:", errorData);
        return NextResponse.json({
          error: "عذراً، يواجه النظام بعض الصعوبات التقنية في إنشاء الامتحان حالياً. يرجى المحاولة مرة أخرى لاحقاً."
        }, { status: 500 });
      }

      const data = await response.json();
      examContent = data.choices[0].message.content;
    } else {
      // استخدام Google Gemini API
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
        console.error("Error from Gemini:", errorData);
        return NextResponse.json({
          error: "عذراً، يواجه النظام بعض الصعوبات التقنية في إنشاء الامتحان حالياً. يرجى المحاولة مرة أخرى لاحقاً."
        }, { status: 500 });
      }

      const data = await response.json();
      examContent = data.candidates[0].content.parts[0].text;
    }

    // محاولة تحليل المحتوى كـ JSON
    try {
      const examData = JSON.parse(examContent);

      // حفظ الامتحان في قاعدة البيانات
      const exam = await prisma.exam.create({
        data: {
          subject: subject as any,
          title: `امتحان ${subject} - ${year} - ${lesson}`,
          year: parseInt(year),
          url: "", // سيتم تحديثه لاحقاً عند إنشاء واجهة الامتحان
        }
      });

      return NextResponse.json({ 
        examId: exam.id,
        questions: examData.questions,
        provider: selectedProvider.name
      });
    } catch (parseError) {
      console.error("Error parsing exam JSON:", parseError);

      // إذا فشل تحليل JSON، قم بإرجاع المحتوى الخام
      return NextResponse.json({ 
        examContent,
        provider: selectedProvider.name
      });
    }
  } catch (error) {
    console.error("Error in AI exam generation API:", error);
    return NextResponse.json(
      { error: "حدث خطأ في معالجة طلبك" },
      { status: 500 }
    );
  }
}
