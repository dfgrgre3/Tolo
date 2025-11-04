import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";

// واجهة برمجة تطبيقات اليوتيب للبحث عن القنوات التعليمية
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export async function POST(request: NextRequest) {
  try {
    const { subject, keywords, platform, provider } = await request.json();

    if (!subject) {
      return NextResponse.json(
        { error: "الرجاء توفير المادة الدراسية" },
        { status: 400 }
      );
    }

    // تحديد مقدم الخدمة
    const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

    // التحقق من مفتاح API
    if (!validateApiKey(selectedProvider === AI_PROVIDERS.OPENAI ? 'OPENAI' : 'GEMINI')) {
      console.error(`API key for ${selectedProvider.name} is not configured`);
      return NextResponse.json(
        { error: `مفتاح API لـ ${selectedProvider.name} غير مهيأ. يرجى التواصل مع فريق الدعم لإضافة مفتاح API صالح.` },
        { status: 500 }
      );
    }

    // التحقق من مفتاح YouTube API إذا كان مطلوبًا
    if ((!platform || platform.toLowerCase().includes("youtube") || platform.toLowerCase().includes("يوتيوب")) && !YOUTUBE_API_KEY) {
      console.error("YouTube API key is not configured");
      return NextResponse.json(
        { error: "مفتاح YouTube API غير مهيأ. يرجى التواصل مع فريق الدعم." },
        { status: 500 }
      );
    }

    // البحث في قاعدة البيانات المحلية أولاً
    let localTeachers = [];
    try {
      localTeachers = await prisma.teacher.findMany({
        where: {
          subject: subject as any,
        }
      });
    } catch (dbError) {
      console.error("Error fetching teachers from database:", dbError);
      // استمر حتى لو فشل البحث في قاعدة البيانات
    }

    // إنشاء رسالة النظام لتوجيه الذكاء الاصطناعي للبحث عن مدرسين
    const systemPrompt = `أنت مساعد ذكاء اصطناعي متخصص في البحث عن المدرسين والمحتوى التعليمي المصري لمنصة ثناوي.
    مهمتك هي البحث عن أفضل مدرسين ومصادر تعليمية لمادة ${subject} ${keywords ? `مع التركيز على: ${keywords}` : ''}.
    ${platform ? `مع التركيز على منصة: ${platform}` : ''}

    قم بتوفير قائمة من 5-10 مدرسين أو قنوات تعليمية مصرية معلوماتهم كالتالي:
    1. اسم المدرس أو القناة
    2. المادة التي يدرسها
    3. رابط القناة أو الملف الشخصي
    4. وصف موجز لأسلوب التدريس والمحتوى
    5. تقييم تقريبي (من 1 إلى 5)

    يجب أن تكون جميع الروابط لمصادر مصرية حقيقية وموثوقة.
    قم بتنسيق الإجابة كـ JSON مع المصفوفات التالية:
    {
      "teachers": [
        {
          "name": "اسم المدرس أو القناة",
          "subject": "المادة",
          "url": "رابط القناة أو الملف الشخصي",
          "description": "وصف موجز",
          "rating": 4.5
        }
      ]
    }`;

    let aiTeachers = [];
    let youtubeResults = [];

    // إذا كان طلب البحث يشمل اليوتيب، قم بالبحث هناك أيضاً
    if (!platform || platform.toLowerCase().includes("youtube") || platform.toLowerCase().includes("يوتيوب")) {
      const searchQuery = `${subject} مدرس مصري ${keywords || ""}`;

      try {
        const youtubeResponse = await fetch(
          `${YOUTUBE_SEARCH_URL}?part=snippet&q=${encodeURIComponent(searchQuery)}&type=channel&key=${YOUTUBE_API_KEY}&maxResults=5`
        );

        if (youtubeResponse.ok) {
          const youtubeData = await youtubeResponse.json();
          if (youtubeData.items && Array.isArray(youtubeData.items)) {
            youtubeResults = youtubeData.items.map((item: any) => ({
              name: item.snippet.channelTitle,
              url: `https://www.youtube.com/channel/${item.snippet.channelId}`,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails.default.url
            }));
          }
        }
      } catch (error) {
        console.error("Error searching YouTube:", error);
      }
    }

    // معالجة استجابة الذكاء الاصطناعي
    try {
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

        if (response.ok) {
          const data = await response.json();
          const teachersContent = data.choices[0].message.content;

          try {
            const teachersData = JSON.parse(teachersContent);
            aiTeachers = teachersData.teachers || [];

            // حفظ المدرسين الجدد في قاعدة البيانات
            for (const teacher of aiTeachers) {
              try {
                await prisma.teacher.upsert({
                  where: {
                    // استخدام اسم المدرس والمادة كمفتاح فريد
                    name_subject: {
                      name: teacher.name,
                      subject: teacher.subject
                    }
                  },
                  update: {
                    onlineUrl: teacher.url,
                    rating: teacher.rating,
                    notes: teacher.description
                  },
                  create: {
                    name: teacher.name,
                    subject: teacher.subject as any,
                    onlineUrl: teacher.url,
                    rating: teacher.rating,
                    notes: teacher.description
                  }
                });
              } catch (dbError) {
                console.error("Error saving teacher to database:", dbError);
              }
            }
          } catch (parseError) {
            console.error("Error parsing teachers JSON:", parseError);
          }
        }
      }
    } catch (aiError) {
      console.error("Error with AI provider:", aiError);
      // استمر حتى لو فشل الذكاء الاصطناعي
    }

    // دمج النتائج من المصادر المختلفة
    // التأكد من أن جميع المصفوفات موجودة
    const result = {
      localTeachers: localTeachers || [],
      aiTeachers: aiTeachers || [],
      youtubeResults: youtubeResults || [],
      message: "تم العثور على قائمة المدرسين بنجاح",
      provider: selectedProvider.name
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in AI teachers search API:", error);
    let errorMessage = "حدث خطأ في معالجة طلبك";

    // تحديد رسالة الخطأ بناءً على نوع الخطأ
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "مفتاح API لـ Google Gemini غير مهيأ. يرجى التواصل مع فريق الدعم.";
      } else if (error.message.includes("fetch")) {
        errorMessage = "فشل الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى لاحقاً.";
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}