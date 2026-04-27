"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  Layout,
  LayoutGrid,
  Layers,
  Loader2,
  Rocket,
  Save,
  Search,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/api-client";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminUpload } from "@/components/admin/ui/admin-upload";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const courseSchema = z.object({
  name: z.string().min(1, "اسم الدورة بالإتجليزية مطلوب"),
  nameAr: z.string().min(1, "اسم الدورة بالعربية مطلوب"),
  code: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "السعر يجب أن يكون صفراً أو أكثر"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  instructorName: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean(),
  isPublished: z.boolean(),
  durationHours: z.coerce
    .number()
    .min(0, "عدد الساعات يجب أن يكون صفراً أو أكثر"),
  requirements: z.string().optional().nullable(),
  learningObjectives: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
  trailerDurationMinutes: z.coerce.number().min(0).optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false),
  language: z.string().nullable().default("ar"),
  coursePrerequisites: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  whatYouLearn: z.string().optional().nullable(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

export interface CourseCategory {
  id: string;
  name: string;
}

export interface CourseTeacher {
  id: string;
  name: string;
}

export interface CourseInitialData {
  id: string;
  name?: string;
  nameAr?: string | null;
  code?: string | null;
  price?: number | null;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | string;
  instructorName?: string | null;
  instructorId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  isActive?: boolean;
  isPublished?: boolean;
  durationHours?: number | null;
  requirements?: string | null;
  learningObjectives?: string | null;
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  trailerDurationMinutes?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  slug?: string | null;
  isFeatured?: boolean;
  language?: string | null;
  coursePrerequisites?: string | string[] | null;
  targetAudience?: string | string[] | null;
  whatYouLearn?: string | string[] | null;
}

interface CourseEditorProps {
  initialData?: CourseInitialData;
  courseId?: string;
  categories?: CourseCategory[];
  teachers?: CourseTeacher[];
  allCourses?: Array<{ id: string; name: string; nameAr?: string | null }>;
}

interface CurriculumStats {
  chaptersCount: number;
  lessonsCount: number;
  freeLessonsCount: number;
  totalDurationMinutes: number;
}

interface UploadedVideoMetadata {
  durationSeconds?: number;
  durationMinutes?: number;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

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
    resolver: zodResolver(courseSchema),
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

  React.useEffect(() => {
    if (!courseId) {
      setCurriculumStats(null);
      return;
    }

    let isMounted = true;

    const fetchCurriculumStats = async () => {
      setIsCurriculumLoading(true);
      try {
        const result = await apiClient.get<any>(`/admin/courses/${courseId}/curriculum`);

        if (isMounted) {
          setCurriculumStats(result.data?.stats || result.stats || null);
        }
      } catch {
        if (isMounted) {
          setCurriculumStats(null);
        }
      } finally {
        if (isMounted) {
          setIsCurriculumLoading(false);
        }
      }
    };

    void fetchCurriculumStats();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const onSubmit = async (values: CourseFormValues) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!courseId;
      const result = await (isEdit 
        ? apiClient.patch<any>(`/admin/courses`, {
            id: initialData.id,
            ...values,
            coursePrerequisites: values.coursePrerequisites || values.requirements || "",
            targetAudience: values.targetAudience || "",
            whatYouLearn: values.whatYouLearn || values.learningObjectives || "",
          })
        : apiClient.post<any>(`/admin/courses`, {
            ...values,
            coursePrerequisites: values.coursePrerequisites || values.requirements || "",
            targetAudience: values.targetAudience || "",
            whatYouLearn: values.whatYouLearn || values.learningObjectives || "",
          }));

      if (result) {
        toast.success(
          isEdit ? "تم تحديث الدورة بنجاح" : "تم إنشاء الدورة بنجاح",
        );
        const createdCourseId = result?.data?.course?.id || result?.id;
        router.refresh();
        if (!isEdit && createdCourseId) {
          router.push(`/admin/courses/${createdCourseId}/curriculum`);
        }
      } else {
        throw new Error(result?.error || result?.message || "فشل حفظ الدورة");
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "فشل حفظ الدورة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextTab = (current: string) => {
    const tabs = ["general", "details", "media", "seo"];
    const index = tabs.indexOf(current);
    if (index < tabs.length - 1) {
      setActiveTab(tabs[index + 1]);
    }
  };

  const prevTab = (current: string) => {
    const tabs = ["general", "details", "media", "seo"];
    const index = tabs.indexOf(current);
    if (index > 0) {
      setActiveTab(tabs[index - 1]);
    }
  };

  const trailerUrl = form.watch("trailerUrl");
  const trailerDurationMinutes = form.watch("trailerDurationMinutes");
  const isDirectVideo =
    !!trailerUrl &&
    (/^\/uploads\//.test(trailerUrl) ||
      /\.(mp4|webm|ogg|mov|avi|mkv|mpeg)(\?.*)?$/i.test(trailerUrl));
  const youtubeMatch = trailerUrl?.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/i,
  );
  const youtubeEmbedUrl = youtubeMatch
    ? `https://www.youtube.com/embed/${youtubeMatch[1]}`
    : null;

  const control = form.control;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        dir="rtl"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-20 bg-background/80 backdrop-blur-md py-4 border-b border-border/50 px-1">
          <div className="flex items-center gap-4">
            <AdminButton
              variant="outline"
              size="icon"
              type="button"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </AdminButton>
            <div>
              <h1 className="text-xl font-black">
                {courseId
                  ? "تعديل الدورة التعليمية"
                  : "إنشاء دورة تعليمية جديدة"}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {form.watch("nameAr") || "دورة غير معنونة"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Badge
              variant="outline"
              className={cn(
                "h-9 px-3 font-bold",
                form.watch("isPublished")
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                  : "border-orange-500/20 bg-orange-500/10 text-orange-500",
              )}
            >
              {form.watch("isPublished") ? "منشورة" : "مسودة"}
            </Badge>
            <AdminButton
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-xl px-6 font-black gap-2 min-w-[120px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ الدورة
            </AdminButton>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-64 space-y-2">
              <TabsList className="flex flex-row lg:flex-col h-auto w-full bg-transparent gap-1 p-0">
                <TabsTrigger
                  value="general"
                  className="w-full justify-start gap-3 rounded-xl py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="font-bold">المعلومات الأساسية</span>
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="w-full justify-start gap-3 rounded-xl py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <FileText className="h-4 w-4" />
                  <span className="font-bold">التفاصيل والأسعار</span>
                </TabsTrigger>
                <TabsTrigger
                  value="media"
                  className="w-full justify-start gap-3 rounded-xl py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Video className="h-4 w-4" />
                  <span className="font-bold">الوسائط والمعاينة</span>
                </TabsTrigger>
                <TabsTrigger
                  value="seo"
                  className="w-full justify-start gap-3 rounded-xl py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Globe className="h-4 w-4" />
                  <span className="font-bold">محركات البحث SEO</span>
                </TabsTrigger>
              </TabsList>

              <AdminCard className="p-4 mt-6 bg-primary/5 border-dashed border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-bold">صحة الدورة</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">صورة الغلاف</span>
                    {form.watch("thumbnailUrl") ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Badge variant="outline" className="h-4 px-1 text-[8px]">
                        ناقص
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">فيديو المقدمة</span>
                    {form.watch("trailerUrl") ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Badge variant="outline" className="h-4 px-1 text-[8px]">
                        ناقص
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      الوصف التفصيلي
                    </span>
                    {form.watch("description")?.length &&
                    (form.watch("description")?.length ?? 0) > 50 ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Badge variant="outline" className="h-4 px-1 text-[8px]">
                        قصير جداً
                      </Badge>
                    )}
                  </div>
                </div>
              </AdminCard>

              {courseId ? (
                <AdminCard className="p-4 bg-slate-950 border-primary/20 text-white">
                  <div className="mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-bold">ربط الدورة بالمحتوى</h4>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] text-slate-400">الفصول</p>
                      <p className="mt-1 text-xl font-black">
                        {isCurriculumLoading ? "..." : curriculumStats?.chaptersCount ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] text-slate-400">الدروس</p>
                      <p className="mt-1 text-xl font-black">
                        {isCurriculumLoading ? "..." : curriculumStats?.lessonsCount ?? 0}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs leading-6 text-slate-300">
                    اربط بيانات الدورة بالمحتوى التعليمي من خلال صفحة المنهج حتى ت٪ر الفصول والدروس بشكل صحيح للطلاب داخل صفحة الدورة والتعلم.
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    <AdminButton
                      type="button"
                      className="w-full justify-between"
                      onClick={() => router.push(`/admin/courses/${courseId}/curriculum`)}
                    >
                      إدارة المنهج الدراسي
                      <Layers className="h-4 w-4" />
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="outline"
                      className="w-full justify-between border-white/15 bg-transparent text-white hover:bg-white/10"
                      onClick={() => router.push(`/admin/courses/${courseId}`)}
                    >
                      صفحة تفاصيل الدورة
                      <ExternalLink className="h-4 w-4" />
                    </AdminButton>
                  </div>
                </AdminCard>
              ) : null}
            </aside>

            <div className="flex-1">
              <TabsContent value="general" className="mt-0 space-y-6">
                <AdminCard className="p-6">
                  <div className="grid gap-6">
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <Layout className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-black">العناوين والهوية</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={control}
                        name="nameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              اسم الدورة بالعربية
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="مثال: الرياضيات المتقدمة للصف الثالث الثانوي"
                                className="h-12 rounded-xl"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              اسم الدورة بالإتجليزية
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Example: Advanced Mathematics"
                                className="h-12 rounded-xl"
                                dir="ltr"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <FormField
                        control={control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              كود الدورة (اختياري)
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="MATH-301"
                                className="h-12 rounded-xl"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">التصنيف</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl">
                                  <SelectValue placeholder="اختر تصنيف" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              مستوى التعقيد
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="BEGINNER">
                                  مبتدئ / أساسي
                                </SelectItem>
                                <SelectItem value="INTERMEDIATE">
                                  متوسط / عادي
                                </SelectItem>
                                <SelectItem value="ADVANCED">
                                  متقدم / احترافي
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">لغة الدورة</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || "ar"}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ar">العربية</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">
                            وصف الدورة
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="أدخل وصفاً كبيراً ومفصلاً للدورة يوضح أهميتها وما سيتم تعلمه..."
                              className="min-h-[150px] rounded-2xl resize-none"
                            />
                          </FormControl>
                          <FormDescription className="text-[10px]">
                            هذا النص سي٪ر في صفحة الدورة الرئيسية أسفل الفيديو التعريفي.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AdminCard>

                <div className="flex justify-end gap-3">
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={() => nextTab("general")}
                    className="h-12 rounded-xl px-8 font-black gap-3"
                  >
                    التالي: التفاصيل والأسعار
                    <ChevronLeft className="h-4 w-4" />
                  </AdminButton>
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-0 space-y-6">
                <AdminCard className="p-6">
                  <div className="grid gap-6">
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-black">التسعير والوصول</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              سعر الدورة (EGP)
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type="number"
                                  className="h-12 rounded-xl pr-12"
                                />
                                <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormDescription className="text-[10px]">
                              اترك السعر 0 لجعل الدورة مجانية.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="durationHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              إجمالي الساعات التقريبي
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type="number"
                                  className="h-12 rounded-xl pr-12"
                                />
                                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={control}
                      name="instructorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">
                            المحاضر / المدرس المسئول
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="اختر مدرساً" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                  {teacher.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AdminCard>

                <AdminCard className="p-6">
                  <div className="grid gap-6">
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-black">المحتوى التعليمي</h3>
                    </div>

                    <FormField
                      control={control}
                      name="requirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">
                            متطلبات الدورة
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="ما الذي يجب على الطالب توفره قبل البدء؟ (ضع كل متطلب في سطر مستقل)"
                              className="min-h-[100px] rounded-2xl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="learningObjectives"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">
                            ماذا ستتعلم؟ (الأهداف)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="ما المخرجات النهائية للطالب بعد إكمال الدورة؟ (ضع كل هدف في سطر مستقل)"
                              className="min-h-[100px] rounded-2xl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">
                            الفئة المستهدفة
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="ضع كل فئة مستهدفة في سطر مستقل"
                              className="min-h-[100px] rounded-2xl"
                            />
                          </FormControl>
                          <FormDescription>
                            مثال: طلاب الصف الثالث الثانوي، طلاب المراجعة النهائية.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="coursePrerequisites"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold flex items-center justify-between">
                            <span>المتطلبات والترابط التعليمي</span>
                            <Badge variant="outline" className="text-[9px] font-black h-4 px-1">جديد</Badge>
                          </FormLabel>
                          <div className="space-y-4">
                            <Select
                              onValueChange={(val) => {
                                const current = field.value ? field.value.split("\n") : [];
                                if (!current.includes(val)) {
                                  field.onChange([...current, val].join("\n"));
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl border-primary/20 bg-primary/5">
                                  <SelectValue placeholder="اختر دورة لربتا كمتطلب..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {allCourses
                                  .filter(c => c.id !== courseId)
                                  .map((c) => (
                                  <SelectItem key={c.id} value={c.nameAr || c.name}>
                                    {c.nameAr || c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="ضع كل متطلب في سطر مستقل ليظڈحفظ بشكل منظم"
                                className="min-h-[120px] rounded-2xl bg-muted/20 border-border/40 focus:border-primary/40 transition-all font-medium py-4"
                              />
                            </FormControl>
                          </div>
                          <FormDescription className="text-[10px] leading-relaxed">
                            اربط هذه الدورة بدورات أخرى في الموقع لتحسين تجربة الطالب وتوجيهه للمسار الصحيح.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="whatYouLearn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">
                            ماذا سيتعلم الطالب
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="ضع كل فائدة أو مهارة في سطر مستقل"
                              className="min-h-[100px] rounded-2xl"
                            />
                          </FormControl>
                          <FormDescription>
                            يدعم بناء محتوى تسويقي وتعليمي أكثر دقة بدون تغيير التصميم.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AdminCard>

                <div className="flex justify-between">
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={() => prevTab("details")}
                    className="h-12 rounded-xl px-8 font-black gap-3"
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={() => nextTab("details")}
                    className="h-12 rounded-xl px-8 font-black gap-3"
                  >
                    التالي: الوسائط وصور العرض
                    <ChevronLeft className="h-4 w-4" />
                  </AdminButton>
                </div>
              </TabsContent>

              <TabsContent value="media" className="mt-0 space-y-6">
                <AdminCard className="p-6">
                  <div className="grid gap-6">
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-black">
                        غلاف الدورة والمعاينة
                      </h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Label className="font-black">
                          الصورة المصغرة (Thumbnail)
                        </Label>
                        <div className="relative aspect-video rounded-3xl overflow-hidden border border-dashed border-border/60 bg-muted/40 group">
                          {form.watch("thumbnailUrl") ? (
                            <img
                              src={form.watch("thumbnailUrl") || ""}
                              alt="Thumbnail Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                              <span className="text-xs font-bold">
                                لم يتم اختيار صورة بعد
                              </span>
                            </div>
                          )}
                        </div>
                        <FormField
                          control={control}
                          name="thumbnailUrl"
                          render={({ field }) => (
                            <AdminUpload
                              onUploadComplete={field.onChange}
                              label="رفع صورة الغلاف"
                              accept="image/*"
                            />
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <Label className="font-black">
                          فيديو المقدمة (Trailer URL)
                        </Label>
                        <div className="relative aspect-video rounded-3xl overflow-hidden border border-dashed border-border/60 bg-muted/40 group">
                          {trailerUrl ? (
                            isDirectVideo ? (
                              <video
                                src={trailerUrl}
                                controls
                                preload="metadata"
                                className="h-full w-full bg-black object-contain"
                              />
                            ) : youtubeEmbedUrl ? (
                              <iframe
                                src={youtubeEmbedUrl}
                                title="Trailer Preview"
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                <Video className="h-12 w-12 text-primary animate-pulse" />
                                <span className="absolute bottom-4 left-4 text-[10px] text-white/50">
                                  {trailerUrl}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                              <Video className="h-12 w-12 mb-2 opacity-20" />
                              <span className="text-xs font-bold">
                                رابط الفيديو الدعائي
                              </span>
                            </div>
                          )}
                        </div>
                        <FormField
                          control={control}
                          name="trailerUrl"
                          render={({ field }) => (
                            <FormItem className="space-y-4">
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="https://youtube.com/watch?v=..."
                                  className="h-12 rounded-xl"
                                />
                              </FormControl>

                              <AdminUpload
                                accept="video/*"
                                label="رفع فيديو المقدمة من الكمبيوتر"
                                maxSize={100 * 1024} // 100GB support
                                onUploadComplete={(url, metadata) => {
                                  field.onChange(url);
                                  setUploadedTrailerMeta(metadata || null);
                                  form.setValue(
                                    "trailerDurationMinutes",
                                    metadata?.durationMinutes || 0,
                                  );
                                }}
                              />

                              {uploadedTrailerMeta?.durationMinutes || trailerDurationMinutes ? (
                                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                                  <div className="flex items-center gap-2 font-bold text-primary">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                      مدة الفيديو المستخرجة: {uploadedTrailerMeta?.durationMinutes || trailerDurationMinutes} دقيقة
                                    </span>
                                  </div>
                                  {uploadedTrailerMeta?.fileName ? (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {uploadedTrailerMeta.fileName}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}

                              <FormDescription>
                                يمكنك كتابة رابط خارجي أو رفع فيديو مباشر من الكمبيوتر، وسيتم حفظ مدة الفيديو تلقائياً عند توفرها.
                              </FormDescription>

                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </AdminCard>

                <div className="flex justify-between">
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={() => prevTab("media")}
                    className="h-12 rounded-xl px-8 font-black gap-3"
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={() => nextTab("media")}
                    className="h-12 rounded-xl px-8 font-black gap-3"
                  >
                    التالي: تهيئة محركات البحث (SEO)
                    <ChevronLeft className="h-4 w-4" />
                  </AdminButton>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="mt-0 space-y-6">
                <AdminCard className="p-6">
                  <div className="grid gap-6">
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <Globe className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-black">
                        تهيئة محركات البحث والتسويق
                      </h3>
                    </div>

                    <FormField
                      control={control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">
                            رابط الصفحة (Slug)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="mathematics-grade-3"
                                className="h-12 rounded-xl pl-32"
                                dir="ltr"
                              />
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                                /courses/
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">
                            اترك الحقل فارغاً سيتم إنتاجه من الاسم تلقائياً.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={control}
                        name="seoTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              عنوان الصفحة (Meta Title)
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                className="h-12 rounded-xl"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="seoDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              وصف محركات البحث (Meta Description)
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                className="min-h-[80px] rounded-xl"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                      <h4 className="text-xs font-bold mb-3 text-muted-foreground flex items-center gap-2">
                        <Search className="h-3 w-3" />
                        معاينة نتائج جوجل
                      </h4>
                      <div className="space-y-1">
                        <div className="text-blue-500 text-lg font-medium hover:underline cursor-pointer">
                          {form.watch("seoTitle") ||
                            form.watch("nameAr") ||
                            "عنوان الدورة ي٪ر هنا"}
                        </div>
                        <div className="text-emerald-700 text-xs">
                          https://thanawy.com/courses/
                          {form.watch("slug") || "course-url"}
                        </div>
                        <div className="text-muted-foreground text-sm line-clamp-2">
                          {form.watch("seoDescription") ||
                            form.watch("description") ||
                            "وصف الدورة ي٪ر هنا في نتائج البحث لجذب الطلاب للنقر والدخول..."}
                        </div>
                      </div>
                    </div>
                  </div>
                </AdminCard>

                <AdminCard className="p-6 bg-slate-900 border-primary/20">
                  <div className="flex items-center justify-between gap-6 overflow-hidden relative">
                    <div className="absolute -right-10 -bottom-10 h-64 w-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <Rocket className="h-6 w-6 text-primary" />
                        <h3 className="text-lg font-black text-white">
                          حالة النشر وال٪ور
                        </h3>
                      </div>
                      <p className="text-sm text-slate-400 max-w-md">
                        عند تفعيل النشر، ست٪ر الدورة لجميع الطلاب في المتجر التعليمي. تأكد من أن جميع الوحدات التعليمية جاهزة.
                      </p>

                      <div className="flex items-center gap-8">
                        <FormField
                          control={control}
                          name="isPublished"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3 space-y-0">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="data-[state=checked]:bg-emerald-500"
                                />
                              </FormControl>
                              <FormLabel className="text-white font-bold cursor-pointer">
                                نشر الدورة فوراً
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="isFeatured"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3 space-y-0">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="data-[state=checked]:bg-amber-500"
                                />
                              </FormControl>
                              <FormLabel className="text-white font-bold cursor-pointer">
                                تمييز الدورة
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3 space-y-0">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="data-[state=checked]:bg-primary"
                                />
                              </FormControl>
                              <FormLabel className="text-white font-bold cursor-pointer">
                                تفعيل الدورة (Active)
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="hidden md:block relative z-10">
                      <div className="h-32 w-32 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-3xl shadow-2xl rotate-12">
                        <Trophy className="h-12 w-12 text-primary" />
                      </div>
                    </div>
                  </div>
                </AdminCard>

                <div className="flex justify-between">
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={() => prevTab("seo")}
                    className="h-12 rounded-xl px-8 font-black gap-3"
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </AdminButton>
                  <AdminButton
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl px-12 font-black gap-3 text-lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    إكمال وحفظ الدورة
                  </AdminButton>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </form>
    </Form>
  );
}

const Label = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <label
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
  >
    {children}
  </label>
);
