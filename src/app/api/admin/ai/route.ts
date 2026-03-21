import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";

type RiskStudent = {
  id: string;
  name: string;
  email: string;
  gradeLevel: string | null;
  riskScore: number;
  reasons: string[];
  latestAverage: number | null;
  studyMinutesLast7Days: number;
  daysSinceLastLogin: number | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || `generated-${Date.now()}`;
}

async function publishApprovedContent(itemId: string) {
  const item = await prisma.aiGeneratedContent.findUnique({
    where: { id: itemId },
    include: {
      subject: { select: { id: true, name: true, nameAr: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!item) {
    throw new Error("Content item not found");
  }

  const metadata = item.metadata ? JSON.parse(item.metadata) as Record<string, unknown> : {};
  if (metadata.publishedEntityType && metadata.publishedEntityId) {
    return {
      entityType: String(metadata.publishedEntityType),
      entityId: String(metadata.publishedEntityId),
    };
  }

  const parsedContent = JSON.parse(item.content) as Record<string, unknown>;

  if (item.type === "exam_blueprint") {
    if (!item.subjectId) {
      throw new Error("Subject is required to publish an exam blueprint");
    }

    const exam = await prisma.aiGeneratedExam.create({
      data: {
        userId: item.userId,
        subjectId: item.subjectId,
        title: String(parsedContent.title || item.title),
        duration: 30,
        year: new Date().getFullYear(),
      },
    });

    const questions = Array.isArray(parsedContent.questions) ? parsedContent.questions : [];
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index] as Record<string, unknown>;
      await prisma.aiQuestion.create({
        data: {
          examId: exam.id,
          order: index,
          question: String(question.question || `Question ${index + 1}`),
          options: Array.isArray(question.options) ? question.options.map((option) => String(option)) : [],
          correctAnswer: String(question.correctAnswer || ""),
          explanation: question.explanation ? String(question.explanation) : null,
          points: 1,
        },
      });
    }

    return {
      entityType: "AiGeneratedExam",
      entityId: exam.id,
    };
  }

  if (item.type === "article_draft") {
    const blogCategory = await prisma.category.findFirst({
      where: { type: "BLOG" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (!blogCategory) {
      throw new Error("No blog category available for publishing article drafts");
    }

    const baseSlug = slugify(String(parsedContent.title || item.title));
    const existing = await prisma.blogPost.findFirst({
      where: { slug: baseSlug },
      select: { id: true },
    });
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

    const post = await prisma.blogPost.create({
      data: {
        title: String(parsedContent.title || item.title),
        slug,
        excerpt: parsedContent.summary ? String(parsedContent.summary) : null,
        content: String(parsedContent.article || ""),
        categoryId: blogCategory.id,
        authorId: item.userId,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    return {
      entityType: "BlogPost",
      entityId: post.id,
    };
  }

  if (item.type === "curriculum_outline") {
    if (!item.subjectId) {
      throw new Error("Subject is required to publish a curriculum outline");
    }

    const resource = await prisma.resource.create({
      data: {
        title: String(parsedContent.title || item.title),
        description: String(parsedContent.overview || "مخطط منهج مولد بالذكاء الاصطناعي وتمت مراجعته."),
        subjectId: item.subjectId,
        type: "document",
        source: "AI Curriculum Generator",
        free: true,
        url: `ai://curriculum/${item.id}`,
      },
    });

    return {
      entityType: "Resource",
      entityId: resource.id,
    };
  }

  return {
    entityType: "AiGeneratedContent",
    entityId: item.id,
  };
}

async function getPublishedEntityDetail(entityType: string, entityId: string) {
  if (entityType === "BlogPost") {
    const post = await prisma.blogPost.findUnique({
      where: { id: entityId },
      include: {
        category: { select: { id: true, name: true } },
        author: { select: { id: true, name: true, email: true } },
      },
    });

    if (!post) return null;
    return {
      entityType,
      entityId,
      title: post.title,
      subtitle: post.category?.name || "مقال منشور",
      meta: `بواسطة ${post.author.name || post.author.email}`,
      content: post.excerpt || post.content.slice(0, 500),
      href: "/admin/blog",
    };
  }

  if (entityType === "Resource") {
    const resource = await prisma.resource.findUnique({
      where: { id: entityId },
      include: {
        subject: { select: { id: true, name: true, nameAr: true } },
      },
    });

    if (!resource) return null;
    return {
      entityType,
      entityId,
      title: resource.title,
      subtitle: resource.subject.nameAr || resource.subject.name,
      meta: resource.source || resource.type,
      content: resource.description || resource.url,
      href: "/admin/resources",
    };
  }

  if (entityType === "AiGeneratedExam") {
    const exam = await prisma.aiGeneratedExam.findUnique({
      where: { id: entityId },
      include: {
        subject: { select: { id: true, name: true, nameAr: true } },
        questions: {
          orderBy: { order: "asc" },
          take: 5,
          select: { question: true },
        },
      },
    });

    if (!exam) return null;
    return {
      entityType,
      entityId,
      title: exam.title,
      subtitle: exam.subject.nameAr || exam.subject.name,
      meta: `${exam.questions.length} أسئلة معروضة من الامتحان`,
      content: exam.questions.map((question, index) => `${index + 1}. ${question.question}`).join("\n"),
      href: "/admin/ai",
    };
  }

  return null;
}

async function callAdminAI(prompt: string, responseFormat: "text" | "json" = "text") {
  const provider = getDefaultProvider();
  const providerKey = provider === AI_PROVIDERS.OPENAI ? "OPENAI" : "GEMINI";

  if (!validateApiKey(providerKey)) {
    throw new Error("AI provider is not configured");
  }

  if (provider === AI_PROVIDERS.OPENAI) {
    const response = await fetch(provider.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 1800,
        ...(responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to call AI provider");
    }

    const data = await response.json();
    return String(data.choices?.[0]?.message?.content || "");
  }

  const response = await fetch(`${provider.baseUrl}${provider.model}:generateContent?key=${provider.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1800,
        responseMimeType: responseFormat === "json" ? "application/json" : "text/plain",
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to call AI provider");
  }

  const data = await response.json();
  return String(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
}

function parseLooseJson<T>(value: string): T {
  const match = value.match(/```json\s*([\s\S]*?)\s*```/) || value.match(/\{[\s\S]*\}/);
  const json = match ? (match[1] || match[0]) : value;
  return JSON.parse(json) as T;
}

async function generateAdminContent(input: {
  contentType: string;
  title: string;
  prompt: string;
  subjectName: string;
}) {
  if (input.contentType === "exam_blueprint") {
    const raw = await callAdminAI(
      `أنت مولد اختبارات إداري لمنصة تعليمية.
أنشئ اختباراً مفاجئاً بناءً على الطلب التالي:
العنوان: ${input.title}
المادة: ${input.subjectName}
الوصف: ${input.prompt}

أعد الإجابة كـ JSON فقط بهذا الشكل:
{
  "title": "عنوان الاختبار",
  "instructions": "تعليمات قصيرة",
  "questions": [
    {
      "question": "نص السؤال",
      "type": "multiple_choice|true_false|short_answer",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswer": "الإجابة الصحيحة",
      "explanation": "شرح مختصر"
    }
  ]
}`,
      "json",
    );

    const parsed = parseLooseJson<{ title?: string; instructions?: string; questions?: unknown[] }>(raw);
    return {
      generatedTitle: parsed.title || input.title,
      payload: {
        title: parsed.title || input.title,
        instructions: parsed.instructions || "راجع الأسئلة قبل النشر.",
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      },
      preview: `اختبار مولد يحتوي على ${Array.isArray(parsed.questions) ? parsed.questions.length : 0} سؤالاً.`,
    };
  }

  if (input.contentType === "curriculum_outline") {
    const raw = await callAdminAI(
      `أنت مساعد مناهج تعليمي.
أنشئ مخطط منهج منظم بناءً على:
العنوان: ${input.title}
المادة: ${input.subjectName}
الوصف: ${input.prompt}

أعد الإجابة كـ JSON فقط بهذا الشكل:
{
  "title": "عنوان المنهج",
  "overview": "ملخص قصير",
  "units": [
    {
      "name": "اسم الوحدة",
      "objectives": ["هدف 1", "هدف 2"],
      "topics": ["موضوع 1", "موضوع 2"]
    }
  ]
}`,
      "json",
    );

    const parsed = parseLooseJson<{ title?: string; overview?: string; units?: unknown[] }>(raw);
    return {
      generatedTitle: parsed.title || input.title,
      payload: {
        title: parsed.title || input.title,
        overview: parsed.overview || "",
        units: Array.isArray(parsed.units) ? parsed.units : [],
      },
      preview: parsed.overview || "تم توليد مخطط منهج جديد بانتظار المراجعة.",
    };
  }

  const raw = await callAdminAI(
    `أنت محرر محتوى تعليمي.
أنشئ مسودة مقال تعليمية عربية وفق البيانات التالية:
العنوان: ${input.title}
المادة: ${input.subjectName}
الوصف: ${input.prompt}

أعد الإجابة كـ JSON فقط بهذا الشكل:
{
  "title": "عنوان المقال",
  "summary": "ملخص قصير",
  "article": "النص الكامل للمقال",
  "reviewChecklist": ["عنصر 1", "عنصر 2"]
}`,
    "json",
  );

  const parsed = parseLooseJson<{ title?: string; summary?: string; article?: string; reviewChecklist?: string[] }>(raw);
  return {
    generatedTitle: parsed.title || input.title,
    payload: {
      title: parsed.title || input.title,
      summary: parsed.summary || "",
      article: parsed.article || "",
      reviewChecklist: Array.isArray(parsed.reviewChecklist) ? parsed.reviewChecklist : [],
    },
    preview: parsed.summary || "تم توليد مسودة مقال تعليمية بانتظار المراجعة.",
  };
}

function calculateRiskStudent(input: {
  id: string;
  name: string | null;
  email: string;
  gradeLevel: string | null;
  lastLogin: Date | null;
  grades: Array<{ grade: number; maxGrade: number; date: Date | null; subject: { nameAr: string | null; name: string } }>;
  studySessions: Array<{ durationMin: number; startTime: Date }>;
}): RiskStudent {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const recentGrades = input.grades
    .filter((grade) => !grade.date || grade.date.getTime() >= sevenDaysAgo)
    .map((grade) => (grade.maxGrade > 0 ? (grade.grade / grade.maxGrade) * 100 : 0));
  const allGrades = input.grades.map((grade) => (grade.maxGrade > 0 ? (grade.grade / grade.maxGrade) * 100 : 0));
  const latestAverage = allGrades.length > 0
    ? Number((allGrades.reduce((sum, value) => sum + value, 0) / allGrades.length).toFixed(1))
    : null;
  const recentAverage = recentGrades.length > 0
    ? recentGrades.reduce((sum, value) => sum + value, 0) / recentGrades.length
    : latestAverage;

  const studyMinutesLast7Days = input.studySessions
    .filter((session) => session.startTime.getTime() >= sevenDaysAgo)
    .reduce((sum, session) => sum + session.durationMin, 0);

  const daysSinceLastLogin = input.lastLogin
    ? Math.floor((now - input.lastLogin.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  let riskScore = 15;
  const reasons: string[] = [];

  if (recentAverage !== null && recentAverage < 50) {
    riskScore += 40;
    reasons.push("متوسط الدرجات الأسبوعي أقل من 50%");
  } else if (recentAverage !== null && recentAverage < 65) {
    riskScore += 25;
    reasons.push("متوسط الدرجات الأسبوعي أقل من 65%");
  }

  if (studyMinutesLast7Days < 45) {
    riskScore += 25;
    reasons.push("زمن الدراسة خلال 7 أيام منخفض جداً");
  } else if (studyMinutesLast7Days < 120) {
    riskScore += 12;
    reasons.push("زمن الدراسة خلال 7 أيام أقل من المطلوب");
  }

  if (daysSinceLastLogin !== null && daysSinceLastLogin >= 7) {
    riskScore += 20;
    reasons.push("لم يسجل دخولاً منذ أكثر من أسبوع");
  } else if (daysSinceLastLogin !== null && daysSinceLastLogin >= 3) {
    riskScore += 10;
    reasons.push("تراجع في الانتظام بالدخول");
  }

  if (input.grades.length === 0) {
    riskScore += 10;
    reasons.push("لا توجد بيانات درجات كافية");
  }

  return {
    id: input.id,
    name: input.name || "بدون اسم",
    email: input.email,
    gradeLevel: input.gradeLevel,
    riskScore: Math.min(99, Math.round(riskScore)),
    reasons,
    latestAverage,
    studyMinutesLast7Days,
    daysSinceLastLogin,
  };
}

async function getRiskStudents(limit = 6) {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    take: 40,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      gradeLevel: true,
      lastLogin: true,
      userGrades: {
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          grade: true,
          maxGrade: true,
          date: true,
          subject: { select: { name: true, nameAr: true } },
        },
      },
      studySessions: {
        take: 12,
        orderBy: { startTime: "desc" },
        select: { durationMin: true, startTime: true },
      },
    },
  });

  return students
    .map((student) => calculateRiskStudent({
      id: student.id,
      name: student.name,
      email: student.email,
      gradeLevel: student.gradeLevel,
      lastLogin: student.lastLogin,
      grades: student.userGrades,
      studySessions: student.studySessions,
    }))
    .filter((student) => student.riskScore >= 45)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

async function getReviewQueue(limit = 8) {
  const items = await prisma.aiGeneratedContent.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      subject: { select: { id: true, name: true, nameAr: true } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    createdAt: item.createdAt,
    status: (() => {
      if (!item.metadata) {
        return item.isUsed ? "approved" : "pending_review";
      }
      try {
        const metadata = JSON.parse(item.metadata) as { reviewStatus?: string };
        if (metadata.reviewStatus === "rejected") {
          return "rejected";
        }
        if (metadata.reviewStatus === "approved" || item.isUsed) {
          return "approved";
        }
      } catch {
        return item.isUsed ? "approved" : "pending_review";
      }
      return "pending_review";
    })(),
    author: item.user.name || item.user.email,
    subject: item.subject?.nameAr || item.subject?.name || "عام",
    preview: (() => {
      let generatedPreview = "";
      if (item.metadata) {
        try {
          const metadata = JSON.parse(item.metadata) as { generatedPreview?: string };
          generatedPreview = metadata.generatedPreview || "";
        } catch {}
      }
      if (generatedPreview) {
        return generatedPreview.slice(0, 240);
      }
      try {
        const parsed = JSON.parse(item.content) as Record<string, unknown>;
        return String(parsed.summary || parsed.overview || parsed.instructions || parsed.article || item.content).slice(0, 240);
      } catch {
        return String(item.content).slice(0, 240);
      }
    })(),
    publishedEntityType: (() => {
      if (!item.metadata) {
        return null;
      }
      try {
        return (JSON.parse(item.metadata) as { publishedEntityType?: string }).publishedEntityType || null;
      } catch {
        return null;
      }
    })(),
    publishedEntityId: (() => {
      if (!item.metadata) {
        return null;
      }
      try {
        return (JSON.parse(item.metadata) as { publishedEntityId?: string }).publishedEntityId || null;
      } catch {
        return null;
      }
    })(),
  }));
}

async function generateAdminCopilotReply(prompt: string) {
  const provider = getDefaultProvider();
  const providerKey = provider === AI_PROVIDERS.OPENAI ? "OPENAI" : "GEMINI";

  const riskStudents = await getRiskStudents(5);
  const reviewQueue = await getReviewQueue(5);

  const context = {
    riskStudents: riskStudents.map((student) => ({
      name: student.name,
      riskScore: student.riskScore,
      latestAverage: student.latestAverage,
      reasons: student.reasons,
    })),
    reviewQueue: reviewQueue.map((item) => ({
      title: item.title,
      type: item.type,
      status: item.status,
      subject: item.subject,
    })),
  };

  if (!validateApiKey(providerKey)) {
    return {
      message: `اقتراح إداري سريع:\n- الطلب: ${prompt}\n- الطلاب الأعلى خطورة حالياً: ${riskStudents.map((student) => `${student.name} (${student.riskScore}%)`).join("، ") || "لا يوجد"}\n- عناصر مراجعة المحتوى: ${reviewQueue.length}\n- ملاحظة: مفاتيح مزود الذكاء الاصطناعي غير مهيأة، لذلك تم إنشاء رد تحليلي محلي فقط.`,
      actions: [
        "راجع قائمة الطلاب المعرضين للخطر في لوحة التحليلات.",
        "راجع عناصر المحتوى المعلقة قبل النشر.",
      ],
    };
  }

  const systemPrompt = `أنت Admin Copilot لمنصة تعليمية. أجب بالعربية وبأسلوب تنفيذي مختصر.
اعتمد فقط على هذا السياق الداخلي:
${JSON.stringify(context)}

إذا طلب المستخدم تقريراً أو إجراءً:
- قدّم ملخصاً تنفيذياً.
- اقترح خطوات تشغيلية واضحة.
- لا تدّع تنفيذ إجراء فعلي ما لم يُذكر ذلك بوضوح.
- إذا كان الطلب يتعلق بامتحان أو محتوى، ذكّر بمرحلة المراجعة البشرية قبل النشر.`;

  if (provider === AI_PROVIDERS.OPENAI) {
    const response = await fetch(provider.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate admin copilot response");
    }

    const data = await response.json();
    return {
      message: data.choices?.[0]?.message?.content || "تعذر إنشاء الرد.",
      actions: [
        "راجع التوصيات المرتبطة بالطلاب مرتفعي المخاطرة.",
        "اعتمد أو ارفض المحتوى قبل النشر.",
      ],
    };
  }

  const response = await fetch(`${provider.baseUrl}${provider.model}:generateContent?key=${provider.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nالطلب: ${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate admin copilot response");
  }

  const data = await response.json();
  return {
    message: data.candidates?.[0]?.content?.parts?.[0]?.text || "تعذر إنشاء الرد.",
    actions: [
      "راجع التوصيات المرتبطة بالطلاب مرتفعي المخاطرة.",
      "اعتمد أو ارفض المحتوى قبل النشر.",
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    const [riskStudents, reviewQueue, subjects] = await Promise.all([
      getRiskStudents(),
      getReviewQueue(),
      prisma.subject.findMany({
        where: { isActive: true },
        take: 20,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, nameAr: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      riskStudents,
      reviewQueue,
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.nameAr || subject.name,
      })),
        summary: {
          highRiskCount: riskStudents.filter((student) => student.riskScore >= 80).length,
          reviewPendingCount: reviewQueue.filter((item) => item.status === "pending_review").length,
        },
        publishedDetail: entityType && entityId ? await getPublishedEntityDetail(entityType, entityId) : null,
      });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load admin AI data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "copilot") {
      const prompt = String(body.prompt || "").trim();
      if (!prompt) {
        return NextResponse.json({ error: "الطلب النصي مطلوب." }, { status: 400 });
      }

      const result = await generateAdminCopilotReply(prompt);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "generate_content") {
      const contentType = String(body.contentType || "summary");
      const title = String(body.title || "محتوى مولد بالذكاء الاصطناعي");
      const prompt = String(body.prompt || "").trim();
      const subjectId = body.subjectId ? String(body.subjectId) : null;

      if (!prompt) {
        return NextResponse.json({ error: "وصف المحتوى المطلوب مطلوب." }, { status: 400 });
      }

      const owner =
        (await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } })) ||
        (await prisma.user.findFirst({ select: { id: true } }));

      if (!owner) {
        return NextResponse.json({ error: "لا يوجد مستخدم متاح لتسجيل طلب التوليد." }, { status: 500 });
      }

      const subject = subjectId
        ? await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, name: true, nameAr: true } })
        : null;

      const generated = await generateAdminContent({
        contentType,
        title,
        prompt,
        subjectName: subject?.nameAr || subject?.name || "عام",
      });

      const created = await prisma.aiGeneratedContent.create({
        data: {
          userId: owner.id,
          type: contentType,
          title: generated.generatedTitle,
          subjectId,
          content: JSON.stringify(generated.payload),
          metadata: JSON.stringify({
            workflow: "human_in_the_loop",
            requestedAt: new Date().toISOString(),
            reviewStatus: "pending_review",
            originalPrompt: prompt,
            generatedPreview: generated.preview,
          }),
          isUsed: false,
        },
      });

      return NextResponse.json({
        success: true,
        item: {
          id: created.id,
          title: created.title,
          type: created.type,
          status: "pending_review",
          preview: generated.preview,
        },
      });
    }

    if (action === "review_content") {
      const id = String(body.id || "");
      const decision = String(body.decision || "");
      if (!id || !["approve", "reject"].includes(decision)) {
        return NextResponse.json({ error: "بيانات المراجعة غير صالحة." }, { status: 400 });
      }

      const current = await prisma.aiGeneratedContent.findUnique({ where: { id } });
      if (!current) {
        return NextResponse.json({ error: "العنصر غير موجود." }, { status: 404 });
      }

      const nextMetadata = {
        ...(current.metadata ? JSON.parse(current.metadata) : {}),
        reviewStatus: decision === "approve" ? "approved" : "rejected",
        reviewedAt: new Date().toISOString(),
      };

      let publishedEntity: { entityType: string; entityId: string } | null = null;
      if (decision === "approve") {
        publishedEntity = await publishApprovedContent(id);
      }

      const updated = await prisma.aiGeneratedContent.update({
        where: { id },
        data: {
          isUsed: decision === "approve",
          metadata: JSON.stringify(nextMetadata),
        },
      });

      if (decision === "approve" && publishedEntity) {
        const finalMetadata = {
          ...nextMetadata,
          publishedEntityType: publishedEntity.entityType,
          publishedEntityId: publishedEntity.entityId,
        };

        await prisma.aiGeneratedContent.update({
          where: { id },
          data: {
            metadata: JSON.stringify(finalMetadata),
          },
        });
      }

      return NextResponse.json({
        success: true,
        item: {
          id: updated.id,
          status: decision === "approve" ? "approved" : "rejected",
          publishedEntityType: publishedEntity?.entityType || null,
          publishedEntityId: publishedEntity?.entityId || null,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process admin AI request" },
      { status: 500 },
    );
  }
}
