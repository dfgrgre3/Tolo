
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_PROVIDERS, getDefaultProvider } from "@/lib/ai-config";

export async function POST(request: NextRequest) {
  try {
    const { userId, subject, studyGoal, challenges, currentGrade, provider } = await request.json();

    // تحديد مقدم الخدمة
    const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

    if (!selectedProvider.apiKey) {
      return NextResponse.json(
        { error: `مفتاح API لـ ${selectedProvider.name} غير مهيأ` },
        { status: 500 }
      );
    }

    // الحصول على بيانات المستخدم إذا تم توفير معرف المستخدم
    let userData = null;
    if (userId) {
      userData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subjects: true,
          progress: {
            orderBy: { date: 'desc' },
            take: 5
          },
          exams: {
            orderBy: { takenAt: 'desc' },
            take: 5
          }
        }
      });
    }

    // إنشاء رسالة النظام لتوجيه الذكاء الاصطناعي لتقديم النصائح
    const systemPrompt = `أنت مساعد ذكاء اصطناعي متخصص في الإرشاد الأكاديمي لمنصة ثناوي.
    مهمتك هي تقديم نصائح تعليمية مخصصة وفعالة للطالب.

    معلومات الطالب:
    ${userData ? `
    - الاسم: ${userData.name || "غير محدد"}
    - المواد المسجلة: ${userData.subjects.map(s => s.subject).join(", ") || "لا توجد مواد مسجلة"}
    - متوسط درجات الامتحانات الأخيرة: ${userData.exams.length > 0 ? (userData.exams.reduce((sum, exam) => sum + exam.score, 0) / userData.exams.length).toFixed(2) : "لا توجد بيانات"}
    - متوسط وقت الدراسة الأسبوعي: ${userData.progress.length > 0 ? (userData.progress.reduce((sum, p) => sum + p.totalStudyMinutes, 0) / userData.progress.length / 60).toFixed(2) + " ساعات" : "لا توجد بيانات"}
    ` : "لا توجد بيانات مستخدم متاحة"}

    طلب النصائح:
    ${subject ? `- المادة: ${subject}` : ""}
    ${studyGoal ? `- الهدف الدراسي: ${studyGoal}` : ""}
    ${challenges ? `- التحديات التي يواجهها الطالب: ${challenges}` : ""}
    ${currentGrade ? `- المستوى الدراسي الحالي: ${currentGrade}` : ""}

    قم بتقديم نصائح عملية ومخصصة تشمل:
    1. استراتيجيات الدراسة الفعالة
    2. كيفية التغلب على التحديات المذكورة
    3. مصادر تعليمية موصى بها
    4. خطة دراسية مقترحة
    5. نصائح لتحسين الأداء الأكاديمي

    يجب أن تكون النصائح عملية وواقعية وقابلة للتطبيق.
    قم بتنسيق الإجابة كـ JSON مع البنية التالية:
    {
      "tips": [
        {
          "category": "استراتيجيات الدراسة|التغلب على التحديات|المصادر التعليمية|الخطة الدراسية|تحسين الأداء",
          "title": "عنوان النصيحة",
          "content": "محتوى النصيحة المفصل",
          "priority": "high|medium|low"
        }
      ],
      "summary": "ملخص شامل للنصائح المقدمة"
    }`;

    let tipsContent = "";

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
          error: "عذراً، يواجه النظام بعض الصعوبات التقنية في تقديم النصائح حالياً. يرجى المحاولة مرة أخرى لاحقاً."
        }, { status: 500 });
      }

      const data = await response.json();
      tipsContent = data.choices[0].message.content;
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
          error: "عذراً، يواجه النظام بعض الصعوبات التقنية في تقديم النصائح حالياً. يرجى المحاولة مرة أخرى لاحقاً."
        }, { status: 500 });
      }

      const data = await response.json();
      tipsContent = data.candidates[0].content.parts[0].text;
    }

    // محاولة تحليل المحتوى كـ JSON
    try {
      const tipsData = JSON.parse(tipsContent);

      // حفظ النصائح في قاعدة البيانات إذا كان هناك معرف مستخدم
      if (userId) {
        for (const tip of tipsData.tips) {
          try {
            await prisma.recommendation.create({
              data: {
                userId: userId,
                title: tip.title,
                message: tip.content
              }
            });
          } catch (dbError) {
            console.error("Error saving recommendation to database:", dbError);
          }
        }
      }

      return NextResponse.json({
        ...tipsData,
        provider: selectedProvider.name
      });
    } catch (parseError) {
      console.error("Error parsing tips JSON:", parseError);

      // إذا فشل تحليل JSON، قم بإرجاع المحتوى الخام
      return NextResponse.json({ 
        rawContent: tipsContent,
        message: "تم إنشاء النصائح ولكن حدث خطأ في تنسيقها. يرجى مراجعة المحتوى أدناه.",
        provider: selectedProvider.name
      });
    }
  } catch (error) {
    console.error("Error in AI tips API:", error);
    return NextResponse.json(
      { error: "حدث خطأ في معالجة طلبك" },
      { status: 500 }
    );
  }
}
