"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { Form } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";

import {
  courseSchema,
  TABS,
  type CourseEditorProps,
  type CourseFormValues,
  type CurriculumStats,
  type UploadedVideoMetadata,
} from "./types";
import { CourseEditorHeader } from "./course-editor-header";
import { CourseEditorSidebar } from "./course-editor-sidebar";
import { GeneralTab } from "./general-tab";
import { DetailsTab } from "./details-tab";
import { MediaTab } from "./media-tab";
import { SeoTab } from "./seo-tab";

export function CourseEditor({
  initialData,
  courseId,
  categories = [],
  teachers = [],
  allCourses = [],
}: CourseEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("general");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [curriculumStats, setCurriculumStats] = React.useState<CurriculumStats | null>(null);
  const [isCurriculumLoading, setIsCurriculumLoading] = React.useState(false);
  const [uploadedTrailerMeta, setUploadedTrailerMeta] =
    React.useState<UploadedVideoMetadata | null>(null);

  const toMultiline = React.useCallback((value?: string[] | string | null) => {
    if (Array.isArray(value)) {
      return value.join("\n");
    }

    return value || "";
  }, []);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      nameAr: initialData?.nameAr || "",
      code: initialData?.code || "",
      price: initialData?.price || 0,
      level:
        (initialData?.level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") ||
        "INTERMEDIATE",
      instructorName: initialData?.instructorName || "",
      instructorId: initialData?.instructorId || "",
      categoryId: initialData?.categoryId || "",
      description: initialData?.description || "",
      isActive: initialData?.isActive ?? true,
      isPublished: initialData?.isPublished ?? false,
      durationHours: initialData?.durationHours || 0,
      requirements: initialData?.requirements || "",
      learningObjectives: initialData?.learningObjectives || "",
      thumbnailUrl: initialData?.thumbnailUrl || "",
      trailerUrl: initialData?.trailerUrl || "",
      trailerDurationMinutes: initialData?.trailerDurationMinutes || 0,
      seoTitle: initialData?.seoTitle || "",
      seoDescription: initialData?.seoDescription || "",
      slug: initialData?.slug || "",
      isFeatured: initialData?.isFeatured ?? false,
      language: initialData?.language || "ar",
      coursePrerequisites: toMultiline(initialData?.coursePrerequisites),
      targetAudience: toMultiline(initialData?.targetAudience),
      whatYouLearn:
        toMultiline(initialData?.whatYouLearn) ||
        toMultiline(initialData?.learningObjectives),
    },
  });

  // ─── Fetch curriculum stats ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!courseId) {
      setCurriculumStats(null);
      return;
    }

    let isMounted = true;

    const fetchCurriculumStats = async () => {
      setIsCurriculumLoading(true);
      let stats: CurriculumStats | null = null;
      try {
        const result = await apiClient.get<any>(`/admin/courses/${courseId}/curriculum`);
        stats = result.data?.stats || result.stats || null;
      } catch {
        stats = null;
      }
      if (isMounted) {
        setCurriculumStats(stats);
        setIsCurriculumLoading(false);
      }
    };

    void fetchCurriculumStats();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // ─── Form submit ─────────────────────────────────────────────────────────
  const onSubmit = async (values: CourseFormValues) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!courseId;
      const payload = {
            ...(isEdit && initialData?.id ? { id: initialData.id } : {}),
            ...values,
            coursePrerequisites: values.coursePrerequisites || values.requirements || "",
            targetAudience: values.targetAudience || "",
            whatYouLearn: values.whatYouLearn || values.learningObjectives || "",
          };
      const result = await (isEdit ? apiClient.patch<any>(`/admin/courses`, payload) : apiClient.post<any>(`/admin/courses`, payload));

      if (!result) {
        throw new Error("فشل حفظ الدورة");
      }

      toast.success(
        isEdit ? "تم تحديث الدورة بنجاح" : "تم إنشاء الدورة بنجاح",
      );
      router.refresh();

      const createdCourseId = !isEdit && (result?.data?.course?.id || result?.id);
      if (createdCourseId) {
        router.push(`/admin/courses/${createdCourseId}/curriculum`);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "فشل حفظ الدورة");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Tab navigation ──────────────────────────────────────────────────────
  const nextTab = (current: string) => {
    const index = TABS.indexOf(current as any);
    if (index < TABS.length - 1) {
      setActiveTab(TABS[index + 1]!);
    }
  };

  const prevTab = (current: string) => {
    const index = TABS.indexOf(current as any);
    if (index > 0) {
      setActiveTab(TABS[index - 1]!);
    }
  };

  // ─── Trailer video helpers ───────────────────────────────────────────────
  const trailerUrl = form.watch("trailerUrl");
  const trailerDurationMinutes = form.watch("trailerDurationMinutes");
  const { isDirectVideo, youtubeEmbedUrl } = React.useMemo(() => {
    const isDirectVideo =
      !!trailerUrl &&
      // Matches absolute CDN URLs (Supabase Storage, S3, etc.) ending with video extensions
      (/^https?:\/\/.+\.(mp4|webm|ogg|mov|avi|mkv|mpeg)(\?.*)?$/i.test(trailerUrl));
    const youtubeMatch = trailerUrl?.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/i,
    );
    const youtubeEmbedUrl = youtubeMatch
      ? `https://www.youtube.com/embed/${youtubeMatch[1]}`
      : null;
    return { isDirectVideo, youtubeEmbedUrl };
  }, [trailerUrl]);

  // ─── AI generation ───────────────────────────────────────────────────────
  const generateWithAI = async (field: "description" | "seoDescription") => {
    const name = form.getValues("nameAr") || form.getValues("name");
    if (!name) {
      toast.error("يرجى إدخال اسم الدورة أولاً");
      return;
    }

    const toastId = toast.loading("جاري توليد المحتوى بالذكاء الاصطناعي...");
    try {
      const response = await fetch(apiRoutes.ai.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: `قم بكتابة ${field === 'description' ? 'وصف تفصيلي وجذاب' : 'وصف SEO مختصر'} لدورة تعليمية بعنوان "${name}".` 
        }),
      });
      const result = await response.json();
      if (result.reply) {
        form.setValue(field, result.reply);
        toast.success("تم توليد المحتوى بنجاح", { id: toastId });
      }
    } catch {
      toast.error("فشل الاتصال بمساعد الذكاء الاصطناعي", { id: toastId });
    }
  };

  const control = form.control;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        dir="rtl"
      >
        <CourseEditorHeader
          courseId={courseId}
          nameAr={form.watch("nameAr")}
          isPublished={form.watch("isPublished")}
          isSubmitting={isSubmitting}
          onBack={() => router.back()}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col lg:flex-row gap-8">
            <CourseEditorSidebar
              courseId={courseId}
              thumbnailUrl={form.watch("thumbnailUrl")}
              trailerUrl={form.watch("trailerUrl")}
              description={form.watch("description")}
              isCurriculumLoading={isCurriculumLoading}
              chaptersCount={curriculumStats?.chaptersCount ?? 0}
              lessonsCount={curriculumStats?.lessonsCount ?? 0}
              onNavigate={(path) => router.push(path)}
            />

            <div className="flex-1">
              <GeneralTab
                control={control}
                categories={categories}
                onNext={() => nextTab("general")}
                onGenerateWithAI={generateWithAI}
              />

              <DetailsTab
                control={control}
                teachers={teachers}
                courseId={courseId}
                allCourses={allCourses}
                onNext={() => nextTab("details")}
                onPrev={() => prevTab("details")}
              />

              <MediaTab
                control={control}
                watch={form.watch}
                setValue={form.setValue}
                trailerUrl={trailerUrl}
                isDirectVideo={isDirectVideo}
                youtubeEmbedUrl={youtubeEmbedUrl}
                uploadedTrailerMeta={uploadedTrailerMeta}
                setUploadedTrailerMeta={setUploadedTrailerMeta}
                trailerDurationMinutes={trailerDurationMinutes}
                onNext={() => nextTab("media")}
                onPrev={() => prevTab("media")}
              />

              <SeoTab
                control={control}
                watch={form.watch}
                isSubmitting={isSubmitting}
                onPrev={() => prevTab("seo")}
              />
            </div>
          </div>
        </Tabs>
      </form>
    </Form>
  );
}
