import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronLeft, Star, Users, Clock, BookOpen, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import CourseDetailClient from "./CourseDetailClient";
import { SITE } from "@thanawy/shared/site-config";
import type { Course, CourseLesson } from "./_components/types";
import { levelConfig } from "./_components/types";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://backend-gamma-lyart-16.vercel.app/api";

  try {
    const res = await fetch(`${apiUrl}/courses/${id}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!res.ok) {
      return {
        title: `كورس غير موجود | ${SITE.name}`,
        description: "تفاصيل الدورة التعليمية المطلوبة غير متوفرة حالياً."
      };
    }

    const courseData = await res.json();
    // API returns { success: true, data: { subject: {...}, data: {...} } }
    // Unwrap the envelope to get the actual payload
    const payload = courseData?.data ?? courseData;
    const subject = payload?.subject ?? payload;

    if (!subject || !subject.id) {
      return {
        title: `كورس غير موجود | ${SITE.name}`,
        description: "تفاصيل الدورة التعليمية المطلوبة غير متوفرة حالياً."
      };
    }

    const title = `${subject.nameAr || subject.name} - كورس تفاعلي | ${SITE.name}`;
    const description = subject.description || `ابدأ في تعلم هذا الكورس التفاعلي على منصة ${SITE.name} التعليمية.`;
    const imageUrl = subject.thumbnailUrl || "/favicon.svg";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 600,
            alt: subject.nameAr || subject.name,
          }
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      }
    };
  } catch (error) {
    console.error("Error generating dynamic metadata:", error);
    return {
      title: `تفاصيل الكورس | ${SITE.name}`,
      description: `منصة ${SITE.name} التعليمية للثانوية العامة`
    };
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://backend-gamma-lyart-16.vercel.app/api";
  let schema = null;
  let initialCourseData: Course | null = null;
  let initialLessons: CourseLesson[] = [];

  try {
    const res = await fetch(`${apiUrl}/courses/${id}`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const courseData = await res.json();
      // API returns { success: true, data: { subject: {...}, data: {...} } }
      // Unwrap the envelope to get the actual payload
      const payload = courseData?.data ?? courseData;
      const subject = payload?.subject ?? payload;
      if (subject && subject.id) {
        schema = {
          "@context": "https://schema.org",
          "@type": "Course",
          "name": subject.nameAr || subject.name,
          "description": subject.description || `كورس تفاعلي على منصة ${SITE.name} التعليمية.`,
          "image": subject.thumbnailUrl || "/favicon.svg",
          "provider": {
            "@type": "Organization",
            "name": SITE.name,
            "sameAs": SITE.url
          },
          "offers": {
            "@type": "Offer",
            "category": "Free",
            "price": "0",
            "priceCurrency": "EGP"
          }
        };

        initialCourseData = {
          id: subject.id,
          title: subject.nameAr || subject.name,
          description: subject.description || `لا يوجد وصف متاح لهذه الدورة.`,
          instructor: subject.instructorName || "المنصة التعليمية",
          subject: subject.nameAr || subject.name,
          level: (subject.level as Course["level"]) || "INTERMEDIATE",
          duration: subject.durationHours || 0,
          thumbnailUrl: subject.thumbnailUrl || undefined,
          price: subject.price || 0,
          rating: subject.rating || 0,
          enrolledCount: subject.enrolledCount || 0,
          createdAt: subject.createdAt || new Date().toISOString(),
          tags: [subject.nameAr || subject.name, ...(subject.tags || [])],
          enrolled: Boolean(courseData.enrollment),
          progress: courseData.enrollment ? courseData.enrollment.progress || 0 : undefined,
          whatYouLearn: subject.whatYouLearn,
          coursePrerequisites: subject.coursePrerequisites,
          targetAudience: subject.targetAudience,
          requirements: subject.requirements,
          learningObjectives: subject.learningObjectives,
        };
      }
    }
  } catch (error) {
    console.error("Error generating Course schema:", error);
  }

  // Pre-fetch lessons on server side (cached for revalidate optimization)
  try {
    const lessonsRes = await fetch(`${apiUrl}/courses/${id}/lessons`, {
      next: { revalidate: 3600 }
    });
    if (lessonsRes.ok) {
      const lessonsData = await lessonsRes.json();
      // API returns { success: true, data: { lessons: [...] } }
      // Unwrap the envelope
      const payload = lessonsData?.data ?? lessonsData;
      const rawLessons = Array.isArray(payload) ? payload : (payload.lessons ?? []);
      initialLessons = rawLessons.map((l: any, i: number) => {
        const durationMinutes = typeof l.durationMinutes === "number" ? l.durationMinutes : l.duration || 0;
        return {
          id: l.id,
          title: l.title || l.name || `الدرس ${i + 1}`,
          description: l.description || undefined,
          content: l.content || undefined,
          videoUrl: l.videoUrl || undefined,
          type: l.type || "VIDEO",
          isFree: Boolean(l.isFree),
          locked: Boolean(l.locked),
          duration: durationMinutes > 0 ? durationMinutes * 60 : 600,
          order: l.order || i + 1,
          completed: false, // Resolves client-side for logged-in users
          progress: 0
        };
      });
    }
  } catch (error) {
    console.error("Error fetching lessons on server:", error);
  }

  const nonce = (await headers()).get('x-nonce') ?? undefined;

  if (!initialCourseData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] flex items-center justify-center">
        <div className="text-center space-y-4">
          <ChevronLeft className="h-16 w-16 text-gray-300 mx-auto" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">لم يتم العثور على الدورة</h2>
          <Link href="/courses">
            <span className="mt-4 inline-block bg-primary text-white px-4 py-2 rounded-lg font-bold">العودة إلى الدورات</span>
          </Link>
        </div>
      </div>
    );
  }

  const levelInfo = levelConfig[initialCourseData.level] || levelConfig.INTERMEDIATE;

  return (
    <>
      {schema && (
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] pb-20 relative overflow-hidden" dir="rtl">
        {/* Ambient background glows */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.04] blur-[150px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/[0.03] blur-[130px] rounded-full" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
          
          {/* Breadcrumb - Static HTML */}
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/courses" className="hover:text-primary transition-colors font-medium">
              الدورات التعليمية
            </Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-gray-900 dark:text-white font-bold truncate">{initialCourseData.title}</span>
          </nav>

          <CourseDetailClient 
            initialCourseData={initialCourseData} 
            initialLessons={initialLessons}
          >
            {/* Static Layout section rendered entirely on Server */}
            <div className="lg:col-span-3 space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("border px-3 py-1 font-bold text-xs rounded-full", levelInfo.bg, levelInfo.color, levelInfo.border)}>
                  {levelInfo.label}
                </Badge>
                <Badge className="border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-3 py-1 font-bold text-xs rounded-full">
                  {initialCourseData.subject}
                </Badge>
                {initialCourseData.price === 0 &&
                  <Badge className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 px-3 py-1 font-bold text-xs rounded-full">
                    مجانية بالكامل
                  </Badge>
                }
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight tracking-tight bg-gradient-to-r from-gray-950 via-gray-900 to-gray-800 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                {initialCourseData.title}
              </h1>

              {/* Description */}
              <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl font-medium">
                {initialCourseData.description}
              </p>

              {/* Instructor Quick Info */}
              <div className="flex items-center gap-4 bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/5 p-3 rounded-2xl max-w-xs">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary/20">
                  {initialCourseData.instructor.charAt(0)}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">المعلم المشرف</p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-black text-gray-900 dark:text-white">{initialCourseData.instructor}</p>
                    <span className="h-3.5 w-3.5 bg-primary/10 dark:bg-primary/20 text-primary rounded-full flex items-center justify-center" title="مدرس موثق">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: Star, label: "التقييم", value: initialCourseData.rating.toFixed(1), color: "text-amber-500" },
                  { icon: Users, label: "المسجلين", value: `${initialCourseData.enrolledCount}+ طالب`, color: "text-blue-500" },
                  { icon: Clock, label: "المدة", value: `${initialCourseData.duration} ساعة`, color: "text-purple-500" },
                  { icon: BookOpen, label: "الدروس", value: `${initialLessons.length} درس`, color: "text-emerald-500" }
                ].map((stat, i) =>
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200/60 dark:border-white/[0.05] bg-white/80 dark:bg-gray-900/40 p-4 shadow-sm hover:scale-[1.02] transition-transform duration-200">
                    <div className={cn("p-2 rounded-xl bg-gray-50 dark:bg-white/5", stat.color.replace("text-", "bg-") + "/10")}>
                      <stat.icon className={cn("h-5 w-5", stat.color)} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{stat.value}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {initialCourseData.tags && initialCourseData.tags.length > 0 &&
                <div className="flex flex-wrap gap-2 pt-2">
                  {initialCourseData.tags.map((tag) =>
                    <span key={tag} className="rounded-xl border border-gray-200/50 dark:border-white/5 bg-gray-100/50 dark:bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      #{tag}
                    </span>
                  )}
                </div>
              }
            </div>
          </CourseDetailClient>

        </div>
      </div>
    </>
  );
}