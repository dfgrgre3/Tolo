"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { z } from "zod";
import {
  BookOpen,
  Clock,
  DollarSign,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,

  Tags,
  TrendingUp,
  Users,
  Globe,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Trash2,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Download } from
"lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminUpload } from "@/components/admin/ui/admin-upload";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { CourseStats } from "@/components/admin/courses/dashboard-stats";
import { CourseCard } from "@/components/admin/courses/course-card";
import { CourseFilters } from "@/components/admin/courses/course-filters";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage } from
"@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { cn, formatPrice } from "@/lib/utils";
import { apiRoutes } from "@/lib/api/routes";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Course {
  id: string;
  name: string;
  nameAr: string | null;
  code: string | null;
  description: string | null;
  price: number;
  level: string;
  instructorName: string | null;
  instructorId: string | null;
  categoryId: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  isActive: boolean;
  isPublished: boolean;
  isFeatured?: boolean;
  durationHours: number;
  requirements: string | null;
  learningObjectives: string | null;
  slug?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  language?: string | null;
  coursePrerequisites?: string[] | null;
  targetAudience?: string[] | null;
  whatYouLearn?: string[] | null;
  _count: {
    enrollments: number;
    topics: number;
    reviews?: number;
    teachers?: number;
  };
}

interface CoursesResponse {
  data: {
    courses: Course[];
    pagination: {
      page?: number;
      limit: number;
      total: number;
      totalPages?: number;
      offset?: number;
      hasMore?: boolean;
      nextCursor?: string | null;
    };
  };
}

interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  coursesCount: number;
}

// â”€â”€â”€ Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const categorySchema = z.object({
  name: z.string().min(1, "اسم التصنيف مطلوب"),
  slug: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  description: z.string().optional().nullable()
});

const quickCourseSchema = z.object({
  name: z.string().min(1, "اسم الدورة بالإنجليزية مطلوب"),
  nameAr: z.string().min(1, "اسم الدورة بالعربية مطلوب"),
  code: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "السعر يجب أن يكون صفرًا أو أكثر"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  instructorName: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean(),
  isPublished: z.boolean(),
  durationHours: z.coerce.number().min(0),
  requirements: z.string().optional().nullable(),
  learningObjectives: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  coursePrerequisites: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  whatYouLearn: z.string().optional().nullable()
});

type QuickCourseValues = z.infer<typeof quickCourseSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const levelLabels: Record<string, string> = {
  BEGINNER: "مبتدئ",
  INTERMEDIATE: "متوسط",
  ADVANCED: "متقدم"
};

const levelStyles: Record<string, string> = {
  BEGINNER: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  INTERMEDIATE: "border-sky-500/20 bg-sky-500/10 text-sky-600",
  ADVANCED: "border-violet-500/20 bg-violet-500/10 text-violet-600"
};

const quickCourseDefaults: QuickCourseValues = {
  name: "",
  nameAr: "",
  code: "",
  price: 0,
  level: "INTERMEDIATE",
  instructorName: "",
  instructorId: "",
  categoryId: "",
  description: "",
  isActive: true,
  isPublished: false,
  durationHours: 0,
  requirements: "",
  learningObjectives: "",
  thumbnailUrl: "",
  trailerUrl: "",
  slug: "",
  seoTitle: "",
  seoDescription: "",
  language: "ar",
  isFeatured: false,
  coursePrerequisites: "",
  targetAudience: "",
  whatYouLearn: ""
};

const defaultCategoryValues: CategoryFormValues = {
  name: "",
  slug: "",
  icon: "",
  description: ""
};

// â”€â”€â”€ Loading Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CourseGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) =>
      <div key={i} className="rounded-2xl border bg-card/60 overflow-hidden animate-pulse">
          <div className="aspect-video bg-muted/50" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted/50 rounded-lg w-3/4" />
            <div className="h-3 bg-muted/50 rounded-lg w-1/2" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-8 bg-muted/50 rounded-xl" />
              <div className="h-8 bg-muted/50 rounded-xl" />
              <div className="h-8 bg-muted/50 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 flex-1 bg-muted/50 rounded-xl" />
              <div className="h-9 flex-1 bg-muted/50 rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>);

}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AdminCoursesPage() {
  const router = useRouter();

  // State
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<CourseCategory | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{open: boolean;id: string | null;}>({
    open: false,
    id: null
  });
  const [categoryDeleteDialog, setCategoryDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [selectedCategoryId,,] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(12);
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filterLevel, setFilterLevel] = React.useState("ALL");
  const [filterStatus, setFilterStatus] = React.useState("ALL");
  const [filterCategory, setFilterCategory] = React.useState("ALL");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const deferredSearch = React.useDeferredValue(search);

  // â”€â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
    "admin",
    "courses",
    page,
    limit,
    deferredSearch,
    selectedCategoryId,
    filterLevel,
    filterStatus,
    filterCategory],

    queryFn: async () => {
      const params = new URLSearchParams({
        offset: String((page - 1) * limit),
        limit: limit.toString()
      });

      if (deferredSearch) params.set("search", deferredSearch);
      if (filterLevel !== "ALL") params.set("level", filterLevel);
      if (filterCategory !== "ALL") params.set("categoryId", filterCategory);

      if (filterStatus === "PUBLISHED") params.set("isPublished", "true");else
      if (filterStatus === "DRAFT") params.set("isPublished", "false");else
      if (filterStatus === "ACTIVE") params.set("isActive", "true");else
      if (filterStatus === "INACTIVE") params.set("isActive", "false");

      const response = await fetch(`${apiRoutes.admin.courses}?${params.toString()}`);
      if (!response.ok) throw new Error("فشل تحميل الدورات");
      return (await response.json()) as CoursesResponse;
    },
    staleTime: 30_000
  });

  const courses = React.useMemo(() => data?.data?.courses ?? [], [data]);
  const pagination = data?.data?.pagination;
  const totalPages = React.useMemo(() => {
    if (!pagination) return 1;
    if (pagination.totalPages) return pagination.totalPages;
    return Math.max(1, Math.ceil((pagination.total || 0) / Math.max(limit, 1)));
  }, [pagination, limit]);

  const { data: teachers = [] } = useQuery({
    queryKey: ["admin", "teachers"],
    queryFn: async () => {
      const response = await fetch(apiRoutes.admin.teachers);
      const result = await response.json();
      return (result.data?.teachers || []) as Array<{id: string;name: string;}>;
    },
    staleTime: 300_000
  });

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["admin", "course-categories"],
    queryFn: async () => {
      const response = await fetch(apiRoutes.admin.courseCategories);
      const result = await response.json();
      return (result.data?.categories || []) as CourseCategory[];
    },
    staleTime: 300_000
  });

  // Forms

  const quickForm = useForm<QuickCourseValues>({
    resolver: zodResolver(quickCourseSchema) as Resolver<QuickCourseValues>,
    defaultValues: quickCourseDefaults
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema) as Resolver<CategoryFormValues>,
    defaultValues: defaultCategoryValues
  });

  // Auto-fill instructor name when picker changes
  const selectedInstructorId = quickForm.watch("instructorId");
  React.useEffect(() => {
    if (!selectedInstructorId) return;
    const teacher = teachers.find((t) => t.id === selectedInstructorId);
    if (teacher) quickForm.setValue("instructorName", teacher.name);
  }, [selectedInstructorId, teachers, quickForm]);

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch, filterLevel, filterStatus, filterCategory]);

  // â”€â”€â”€ Computed Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const statsData = React.useMemo(() => {
    const totalEnrollments = courses.reduce((s, c) => s + (c._count?.enrollments || 0), 0);
    const totalRevenue = courses.reduce((s, c) => s + c.price * (c._count?.enrollments || 0), 0);
    const publishedCourses = courses.filter((c) => c.isPublished).length;
    const draftCourses = courses.filter((c) => !c.isPublished).length;
    return {
      totalEnrollments,
      totalRevenue,
      activeStudents: Math.round(totalEnrollments * 0.72),
      avgCompletion: 65,
      totalCourses: pagination?.total ?? courses.length,
      publishedCourses,
      draftCourses,
      growth: { enrollments: 12, revenue: 8 }
    };
  }, [courses, pagination]);

  // â”€â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const _openQuickCreate = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      quickForm.reset({
        name: course.name,
        nameAr: course.nameAr || "",
        code: course.code || "",
        price: course.price || 0,
        level: course.level as QuickCourseValues["level"] || "INTERMEDIATE",
        instructorName: course.instructorName || "",
        instructorId: course.instructorId || "",
        categoryId: course.categoryId || "",
        description: course.description || "",
        isActive: course.isActive,
        isPublished: course.isPublished,
        durationHours: course.durationHours || 0,
        requirements: course.requirements || "",
        learningObjectives: course.learningObjectives || "",
        thumbnailUrl: course.thumbnailUrl || "",
        trailerUrl: course.trailerUrl || "",
        slug: course.slug || "",
        seoTitle: course.seoTitle || "",
        seoDescription: course.seoDescription || "",
        language: course.language || "ar",
        isFeatured: course.isFeatured ?? false,
        coursePrerequisites: course.coursePrerequisites?.join("\n") || "",
        targetAudience: course.targetAudience?.join("\n") || "",
        whatYouLearn: course.whatYouLearn?.join("\n") || ""
      });
    } else {
      setEditingCourse(null);
      quickForm.reset(quickCourseDefaults);
    }
    setQuickCreateOpen(true);
  };

  const handleQuickSubmit = async (values: QuickCourseValues) => {
    setIsSubmitting(true);
    try {
      const method = editingCourse ? "PATCH" : "POST";
      const payload = {
        ...values,
        ...(editingCourse ? { id: editingCourse.id } : {})
      };

      const response = await fetch(apiRoutes.admin.courses, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.message || result?.error || "تعذر حفظ بيانات الدورة");
        return;
      }

      const createdCourseId = result?.data?.course?.id as string | undefined;
      toast.success(
        editingCourse ?
        "✅ تم تحديث الدورة بنجاح" :
        "✅ تم إنشاء الدورة – سيتم توجيهك لإضافة المنهج الدراسي"
      );
      setQuickCreateOpen(false);
      setEditingCourse(null);
      quickForm.reset(quickCourseDefaults);
      await refetch();

      if (!editingCourse && createdCourseId) {
        router.push(`/admin/courses/${createdCourseId}/curriculum`);
      }
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch(apiRoutes.admin.courses, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id })
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.message || result?.error || "تعذر حذف الدورة");
        return;
      }
      toast.success("تم حذف الدورة بنجاح");
      await refetch();
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleToggleStatus = async (course: Course) => {
    try {
      const response = await fetch(apiRoutes.admin.courses, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: course.id, isPublished: !course.isPublished })
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.message || "فشل تحديث الحالة");
        return;
      }
      toast.success(course.isPublished ? "تم إخفاء الدورة" : "تم نشر الدورة بنجاح");
      await refetch();
    } catch {
      toast.error("فشل تحديث الحالة");
    }
  };

  const handleCategorySubmit = async (values: CategoryFormValues) => {
    try {
      const method = editingCategory ? "PATCH" : "POST";
      const payload = editingCategory ? { ...values, id: editingCategory.id } : values;
      const response = await fetch(apiRoutes.admin.courseCategories, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.error || result?.message || "تعذر حفظ التصنيف");
        return;
      }
      toast.success(editingCategory ? "تم تحديث التصنيف" : "تم إنشاء التصنيف");
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset(defaultCategoryValues);
      await refetchCategories();
      await refetch();
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  const handleCategoryDelete = async () => {
    if (!categoryDeleteDialog.id) return;
    try {
      const response = await fetch(apiRoutes.admin.courseCategories, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryDeleteDialog.id })
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.error || result?.message || "تعذر حذف التصنيف");
        return;
      }
      toast.success("تم حذف التصنيف");
      await refetchCategories();
      await refetch();
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setCategoryDeleteDialog({ open: false, id: null });
    }
  };

  const handleDuplicate = async (course: Course) => {
    try {
      const response = await fetch("/api/admin/courses/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "فشل الاستنساخ");
      toast.success(result.message || "✅ تم استنساخ الدورة بنجاح");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    }
  };

  const _handleToggleActive = async (course: Course) => {
    try {
      const response = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: course.id, isActive: !course.isActive })
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.message || "فشل تحديث الحالة");
        return;
      }
      toast.success(course.isActive ? "✅ تم إيقاف الدورة" : "✅ تم تفعيل الدورة بنجاح");
      await refetch();
    } catch {
      toast.error("فشل تحديث الحالة");
    }
  };

  const handleBatchAction = async (
  action: "publish" | "unpublish" | "activate" | "deactivate" | "delete") =>
  {
    if (selectedIds.length === 0) return;
    try {
      const response = await fetch("/api/admin/courses/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "فشلت العملية الجماعية");
      toast.success(result.message);
      setSelectedIds([]);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    }
  };

  const handleExport = () => {
    window.open("/api/admin/courses/export", "_blank");
  };

  // â”€â”€â”€ Table Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const columns: ColumnDef<Course>[] = [
  {
    accessorKey: "name",
    id: "nameAr",
    header: "الدورة",
    cell: ({ row }) => {
      const course = row.original;
      return (
        <div className="flex items-center gap-3">
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40">
              {course.thumbnailUrl ?
            <Image
              src={course.thumbnailUrl}
              alt={course.name}
              fill
              className="object-cover" /> :


            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <PlayCircle className="h-6 w-6 text-primary/40" />
                </div>
            }
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-black">{course.nameAr || course.name}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <GraduationCap className="h-3 w-3 shrink-0" />
                <span className="truncate">{course.instructorName || "بدون مدرس"}</span>
                {course.code &&
              <span className="text-primary/60 font-bold">#{course.code}</span>
              }
              </div>
            </div>
          </div>);

    }
  },
  {
    accessorKey: "price",
    header: "السعر",
    cell: ({ row }) =>
    <div className="flex items-center gap-1 text-sm font-black">
          {row.original.price === 0 ?
      <span className="text-teal-500">مجانية</span> :

      <>
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">{row.original.price} ج</span>
            </>
      }
        </div>

  },
  {
    accessorKey: "durationHours",
    header: "المدة",
    cell: ({ row }) =>
    <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {row.original.durationHours || 0}h
        </div>

  },
  {
    id: "enrollments",
    header: "الطلاب",
    cell: ({ row }) =>
    <div className="flex items-center gap-1 text-sm font-bold">
          <Users className="h-3.5 w-3.5 text-blue-500" />
          {row.original._count?.enrollments || 0}
        </div>

  },
  {
    id: "topics",
    header: "الوحدات",
    cell: ({ row }) =>
    <div className="flex items-center gap-1 text-sm font-bold">
          <LayoutGrid className="h-3.5 w-3.5 text-violet-500" />
          {row.original._count?.topics || 0}
        </div>

  },
  {
    accessorKey: "level",
    header: "المستوى",
    cell: ({ row }) => {
      const level = (row.original.level || "INTERMEDIATE") as string;
      return (
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
            levelStyles[level] || levelStyles.INTERMEDIATE
          )}>
          
            {levelLabels[level] || level}
          </Badge>);

    }
  },
  {
    accessorKey: "isPublished",
    header: "النشر",
    cell: ({ row }) =>
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        row.original.isPublished ?
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" :
        "border-border/60 bg-muted/30 text-muted-foreground"
      )}>
      
          {row.original.isPublished ? "منشورة" : "مسودة"}
        </Badge>

  },
  {
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) =>
    <Badge
      variant={row.original.isActive ? "default" : "secondary"}
      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold">
      
          {row.original.isActive ? "نشطة" : "موقوفة"}
        </Badge>

  },
  {
    id: "actions",
    header: "إجراءات",
    cell: ({ row }) =>
    <RowActions
      row={row.original}
      onView={(course) => router.push(`/admin/courses/${course.id}`)}
      onEdit={(course) => router.push(`/admin/courses/${course.id}`)}
      onDelete={(course) => setDeleteDialog({ open: true, id: course.id })}
      extraActions={[
      {
        icon: BookOpen,
        label: "إدارة المنهج",
        onClick: (course) => router.push(`/admin/courses/${course.id}/curriculum`)
      },
      {
        icon: TrendingUp,
        label: "التحليلات",
        onClick: (course) => router.push(`/admin/courses/${course.id}/analytics`)
      },
      {
        icon: ExternalLink,
        label: "عرض في الموقع",
        onClick: (course) => router.push(`/courses/${course.id}`)
      }]
      } />


  }];


  // â”€â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const emptyState =
  <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/40 bg-muted/10 py-20 text-center">
      <div className="rounded-3xl bg-primary/10 p-5">
        <BookOpen className="h-10 w-10 text-primary/60" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-black">لا توجد دورات مطابقة</p>
        <p className="text-sm text-muted-foreground">
          جرّب تغيير كلمة البحث أو الفلاتر، أو أنشئ دورة جديدة الآن.
        </p>
      </div>
      <AdminButton
      onClick={() => router.push("/admin/courses/new")}
      className="gap-2 font-black">
      
        <Plus className="h-4 w-4" />
        إنشاء دورة جديدة
      </AdminButton>
    </div>;


  // ——————————————————————————————————————————————————————————————————————————————————————————————————

  return (
    <div className="space-y-8" dir="rtl">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border/50 bg-card/30 p-8 backdrop-blur-xl">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-right">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              إدارة الدورات التعليمية
            </h1>
            <p className="text-lg font-medium text-muted-foreground">
              تحكم في المحتوى، الطلاب، والأداء المالي لمنصة Thanawy
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <AdminButton 
              variant="outline" 
              className="h-12 rounded-2xl px-6 font-black gap-2 bg-background/50 border-border/50"
              onClick={() => setCategoryDialogOpen(true)}
            >
              <Tags className="h-4 w-4" />
              إدارة التصنيفات
            </AdminButton>
            <AdminButton 
              className="h-12 rounded-2xl px-8 font-black gap-2 shadow-xl shadow-primary/20"
              onClick={() => {
                setEditingCourse(null);
                setQuickCreateOpen(true);
              }}
            >
              <Plus className="h-5 w-5" />
              دورة تعليمية جديدة
            </AdminButton>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الدورات", value: statsData.totalCourses, icon: BookOpen, color: "text-blue-500" },
            { label: "الدورات المنشورة", value: statsData.publishedCourses, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "إجمالي الاشتراكات", value: statsData.totalEnrollments, icon: Users, color: "text-violet-500" },
            { label: "صافي الإيرادات", value: formatPrice(statsData.totalRevenue), icon: DollarSign, color: "text-amber-500" },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl border border-border/50 bg-background/40 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn("h-3 w-3", stat.color)} />
                <span className="text-[10px] font-black uppercase text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-black">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <CourseFilters
        onSearch={setSearch}
        onFilterChange={(filters) => {
          setFilterLevel(filters.level);
          setFilterStatus(filters.status);
          setFilterCategory(filters.category);
        }}
        onViewChange={setView}
        currentView={view}
        categories={categories}
        onRefresh={() => refetch()}
        onAddCourse={() => setQuickCreateOpen(true)}
        totalCount={pagination?.total ?? courses.length}
        isLoading={isFetching} />
      

      {/* Batch Actions Bar */}
      {selectedIds.length > 0 &&
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-black text-primary">
              {selectedIds.length} دورة مختارة
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mr-auto">
            <AdminButton
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs font-black gap-1.5"
            onClick={() => handleBatchAction("publish")}>
            
              <Globe className="h-3.5 w-3.5 text-emerald-500" />
              نشر
            </AdminButton>
            <AdminButton
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs font-black gap-1.5"
            onClick={() => handleBatchAction("unpublish")}>
            
              <EyeOff className="h-3.5 w-3.5 text-amber-500" />
              إخفاء
            </AdminButton>
            <AdminButton
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs font-black gap-1.5"
            onClick={() => handleBatchAction("activate")}>
            
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
              تفعيل
            </AdminButton>
            <AdminButton
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs font-black gap-1.5 text-red-500 hover:bg-red-500/10"
            onClick={() => handleBatchAction("delete")}>
            
              <AlertCircle className="h-3.5 w-3.5" />
              حذف
            </AdminButton>
            <AdminButton
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-xs font-bold"
            onClick={() => setSelectedIds([])}>
            
              إلغاء
            </AdminButton>
          </div>
        </div>
      }

      {/* Content */}
      {view === "grid" ?
      isLoading ?
      <CourseGridSkeleton /> :
      courses.length === 0 ?
      emptyState :

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {courses.map((course) =>
        <CourseCard
          key={course.id}
          course={course}
          onEdit={(c) => router.push(`/admin/courses/${c.id}`)}
          onDuplicate={handleDuplicate}
          onDelete={(c) => setDeleteDialog({ open: true, id: c.id })}
          onToggleStatus={handleToggleStatus} />

        )}
          </div> :


      <AdminDataTable
        columns={columns}
        data={courses}
        loading={isLoading}
        selectable
        serverSide
        totalRows={pagination?.total || 0}
        pageCount={totalPages}
        currentPage={page}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        pageSize={limit}
        onSelectionChange={(rows) => setSelectedIds(rows.map((row) => row.id))}
        bulkActions={[
        { label: "نشر", onClick: () => handleBatchAction("publish") },
        { label: "إخفاء", variant: "outline", onClick: () => handleBatchAction("unpublish") },
        { label: "تفعيل", variant: "outline", onClick: () => handleBatchAction("activate") },
        { label: "إيقاف", variant: "outline", onClick: () => handleBatchAction("deactivate") },
        { label: "حذف", variant: "destructive", onClick: () => handleBatchAction("delete") }]
        }
        actions={{ onRefresh: () => refetch() }}
        emptyMessage={{
          title: "لا توجد دورات مطابقة",
          description: "جرّب تغيير الفلاتر أو أنشئ دورة جديدة."
        }}
        toolbar={
        <AdminButton
          variant="outline"
          size="sm"
          className="h-9 rounded-xl gap-2 font-bold"
          onClick={handleExport}>
          
              <Download className="h-4 w-4" />
              تصدير الكل
            </AdminButton>
        } />

      }

      {/* Pagination for grid view */}
      {view === "grid" && totalPages > 1 &&
      <div className="flex items-center justify-center gap-2 pt-4">
          <AdminButton
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="h-10 w-10 rounded-xl p-0">
          
            <ChevronRight className="h-4 w-4" />
          </AdminButton>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={cn(
                  "h-10 w-10 rounded-xl text-sm font-bold transition-all",
                  pageNum === page ?
                  "bg-primary text-primary-foreground shadow-md" :
                  "hover:bg-muted text-muted-foreground"
                )}>
                
                  {pageNum}
                </button>);

          })}
          </div>
          <AdminButton
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="h-10 w-10 rounded-xl p-0">
          
            <ChevronLeft className="h-4 w-4" />
          </AdminButton>
        </div>
      }

      {/* â”€â”€â”€ Quick Edit Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog
        open={quickCreateOpen}
        onOpenChange={(open) => {
          setQuickCreateOpen(open);
          if (!open) {
            setEditingCourse(null);
            quickForm.reset(quickCourseDefaults);
          }
        }}>
        
        <DialogContent className="max-w-5xl rounded-[2rem] p-0">
          <div className="grid max-h-[88vh] gap-0 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
            {/* Form Side */}
            <div className="overflow-y-auto p-6 sm:p-8" dir="rtl">
              <DialogHeader className="space-y-2 text-right">
                <DialogTitle className="text-2xl font-black">
                  {editingCourse ? "تعديل بيانات الدورة" : "إنشاء دورة سريع"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {editingCourse ?
                  "عدّل البيانات الأساسية â€“ للتحكم الكامل توجّه لصفحة المحرر." :
                  "أدخل البيانات الأساسية ثم أضف المنهج الدراسي والوسائط من صفحة الدورة."}
                </p>
                {!editingCourse &&
                <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs font-bold text-primary">
                      بعد الإنشاء ستُوجِّه تلقائيًا لصفحة إضافة الفصول والدروس.
                    </p>
                  </div>
                }
              </DialogHeader>

              <Form {...quickForm}>
                <form
                  onSubmit={quickForm.handleSubmit(handleQuickSubmit)}
                  className="mt-6 space-y-5">
                  
                  {/* Names */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={quickForm.control}
                      name="nameAr"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">اسم الدورة بالعربية *</FormLabel>
                          <FormControl>
                            <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="مثال: أساسيات الرياضيات"
                            className="h-11 rounded-xl" />
                          
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={quickForm.control}
                      name="name"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">Course Name (EN) *</FormLabel>
                          <FormControl>
                            <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Math Fundamentals"
                            dir="ltr"
                            className="h-11 rounded-xl" />
                          
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                  </div>

                  {/* Code & Slug */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={quickForm.control}
                      name="code"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">كود الدورة</FormLabel>
                          <FormControl>
                            <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="MATH-2026"
                            className="h-11 rounded-xl" />
                          
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={quickForm.control}
                      name="slug"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">الرابط المختصر</FormLabel>
                          <FormControl>
                            <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="math-fundamentals"
                            dir="ltr"
                            className="h-11 rounded-xl" />
                          
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                  </div>

                  {/* Description */}
                  <FormField
                    control={quickForm.control}
                    name="description"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel className="font-bold">الوصف</FormLabel>
                        <FormControl>
                          <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="ملخص واضح لما سيتعلمه الطالب داخل الدورة..."
                          className="min-h-[90px] rounded-xl resize-none" />
                        
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  

                  {/* Price, Hours, Level, Language */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField
                      control={quickForm.control}
                      name="price"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">السعر (ج)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-11 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={quickForm.control}
                      name="durationHours"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">الساعات</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-11 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={quickForm.control}
                      name="level"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">المستوى</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="BEGINNER">مبتدئ</SelectItem>
                              <SelectItem value="INTERMEDIATE">متوسط</SelectItem>
                              <SelectItem value="ADVANCED">متقدم</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={quickForm.control}
                      name="language"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">اللغة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "ar"}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl">
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
                      } />
                    
                  </div>

                  {/* Instructor & Category */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={quickForm.control}
                      name="instructorId"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">المدرس</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="اختر مدرسًا" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teachers.map((t) =>
                            <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                            )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={quickForm.control}
                      name="categoryId"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">التصنيف</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="اختر تصنيفًا" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) =>
                            <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                            )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                  </div>

                  {/* Media */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={quickForm.control}
                      name="thumbnailUrl"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">صورة الغلاف</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="رابط مباشر للصورة"
                              className="h-11 rounded-xl" />
                            
                              <AdminUpload
                              accept="image/*"
                              label="رفع صورة"
                              onUploadComplete={(url) => field.onChange(url)} />
                            
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                    <FormField
                      control={quickForm.control}
                      name="trailerUrl"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel className="font-bold">فيديو تعريفي</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="رابط يوتيوب أو فيديو مباشر"
                              className="h-11 rounded-xl" />
                            
                              <AdminUpload
                              accept="video/*"
                              label="رفع فيديو"
                              maxSize={5 * 1024}
                              onUploadComplete={(url) => field.onChange(url)} />
                            
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                  </div>

                  {/* Toggles */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(["isActive", "isPublished", "isFeatured"] as const).map((name) => {
                      const labels = {
                        isActive: { title: "تفعيل الدورة", desc: "تظهر في النظام" },
                        isPublished: { title: "نشر للطلاب", desc: "مرئية للجمهور" },
                        isFeatured: { title: "دورة مميزة", desc: "تمييز خاص" }
                      };
                      return (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-2xl border bg-muted/20 p-3.5">
                          
                          <div>
                            <p className="text-sm font-black">{labels[name].title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {labels[name].desc}
                            </p>
                          </div>
                          <FormField
                            control={quickForm.control}
                            name={name}
                            render={({ field }) =>
                            <FormControl>
                                <Switch
                                checked={field.value as boolean}
                                onCheckedChange={field.onChange} />
                              
                              </FormControl>
                            } />
                          
                        </div>);

                    })}
                  </div>

                  <DialogFooter className="gap-2 pt-2">
                    {editingCourse &&
                    <AdminButton
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/admin/courses/${editingCourse.id}`)}
                      className="gap-2">
                      
                        <ExternalLink className="h-4 w-4" />
                        فتح المحرر الكامل
                      </AdminButton>
                    }
                    <AdminButton
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-12 text-base font-black gap-2">
                      
                      {isSubmitting ?
                      <Loader2 className="h-4 w-4 animate-spin" /> :

                      <CheckCircle2 className="h-4 w-4" />
                      }
                      {editingCourse ? "حفظ التعديلات" : "إنشاء الدورة"}
                    </AdminButton>
                  </DialogFooter>
                </form>
              </Form>
            </div>

            {/* Preview Side */}
            <div className="border-r bg-muted/10 p-6 hidden lg:block" dir="rtl">
              <div className="sticky top-0 space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                    معاينة سريعة
                  </p>
                  <h3 className="mt-2 text-xl font-black leading-snug">
                    {quickForm.watch("nameAr") || quickForm.watch("name") || "دورة جديدة"}
                  </h3>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border bg-background shadow-sm">
                  <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-primary/5">
                    {quickForm.watch("thumbnailUrl") ?
                    <img
                      src={quickForm.watch("thumbnailUrl") || ""}
                      alt="preview"
                      className="h-full w-full object-cover" /> :


                    <div className="flex h-full items-center justify-center">
                        <PlayCircle className="h-12 w-12 text-primary/30" />
                      </div>
                    }
                    <div className="absolute top-3 right-3">
                      <Badge
                        className={cn(
                          "rounded-lg text-[10px] font-black px-2 py-0.5 border",
                          quickForm.watch("isPublished") ?
                          "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                          "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        )}>
                        
                        {quickForm.watch("isPublished") ? "منشورة" : "مسودة"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full text-[11px]",
                          levelStyles[quickForm.watch("level")] || levelStyles.INTERMEDIATE
                        )}>
                        
                        {levelLabels[quickForm.watch("level")] || "متوسط"}
                      </Badge>
                      <Badge
                        variant={quickForm.watch("isActive") ? "default" : "secondary"}
                        className="rounded-full text-[11px]">
                        
                        {quickForm.watch("isActive") ? "نشطة" : "موقوفة"}
                      </Badge>
                    </div>
                    <p className="text-xs leading-6 text-muted-foreground line-clamp-3">
                      {quickForm.watch("description") ||
                      "أضف وصفًا يوضح قيمة الدورة للطلاب..."}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-muted/40 p-3">
                        <p className="text-[10px] font-bold text-muted-foreground">السعر</p>
                        <p className="mt-1 text-lg font-black">
                          {quickForm.watch("price") === 0 ?
                          "مجانية" :
                          `${quickForm.watch("price")} ج`}
                        </p>
                      </div>
                      <div className="rounded-xl bg-muted/40 p-3">
                        <p className="text-[10px] font-bold text-muted-foreground">المدة</p>
                        <p className="mt-1 text-lg font-black">
                          {quickForm.watch("durationHours") || 0}h
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed bg-background p-4">
                  <p className="text-xs font-black mb-1">توصية قبل النشر</p>
                  <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                    <li className="flex items-center gap-2">
                      {quickForm.watch("thumbnailUrl") ?
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> :

                      <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                      }
                      صورة الغلاف
                    </li>
                    <li className="flex items-center gap-2">
                      {(quickForm.watch("description")?.length ?? 0) > 50 ?
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> :

                      <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                      }
                      وصف تفصيلي كافٍ
                    </li>
                    <li className="flex items-center gap-2">
                      {quickForm.watch("instructorId") ?
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> :

                      <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                      }
                      مدرس مرتبط
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Category Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            categoryForm.reset(defaultCategoryValues);
          }
        }}>
        
        <DialogContent className="max-w-2xl rounded-[2rem] p-0">
          <div className="p-6 sm:p-8" dir="rtl">
            <DialogHeader className="space-y-2 text-right">
              <DialogTitle className="text-2xl font-black">
                {editingCategory ? "تعديل تصنيف" : "إضافة تصنيف جديد"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                استخدم التصنيفات لتنظيم دوراتك في مجموعات منطقية.
              </p>
            </DialogHeader>

            <Form {...categoryForm}>
              <form
                onSubmit={categoryForm.handleSubmit(handleCategorySubmit)}
                className="mt-6 space-y-5">
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel className="font-bold">اسم التصنيف *</FormLabel>
                        <FormControl>
                          <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="مثال: الرياضيات"
                          className="h-11 rounded-xl" />
                        
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  
                  <FormField
                    control={categoryForm.control}
                    name="slug"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel className="font-bold">الرابط المختصر</FormLabel>
                        <FormControl>
                          <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="mathematics"
                          dir="ltr"
                          className="h-11 rounded-xl" />
                        
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={categoryForm.control}
                    name="icon"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel className="font-bold">الأيقونة (اسم Lucide)</FormLabel>
                        <FormControl>
                          <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="BookOpen"
                          className="h-11 rounded-xl" />
                        
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs font-black text-muted-foreground">الدورات المرتبطة</p>
                    <p className="mt-2 text-3xl font-black">{editingCategory?.coursesCount ?? 0}</p>
                  </div>
                </div>
                <FormField
                  control={categoryForm.control}
                  name="description"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel className="font-bold">الوصف</FormLabel>
                      <FormControl>
                        <Textarea
                        {...field}
                        value={field.value || ""}
                        className="min-h-[100px] rounded-xl"
                        placeholder="وصف مختصر لهذا التصنيف..." />
                      
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                
                <DialogFooter className="gap-2 sm:justify-between">
                  {editingCategory &&
                  <AdminButton
                    type="button"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-500/10"
                    onClick={() => {
                      setCategoryDeleteDialog({ open: true, id: editingCategory.id });
                      setCategoryDialogOpen(false);
                    }}>
                    
                      حذف هذا التصنيف
                    </AdminButton>
                  }
                  <div className="flex gap-2">
                    <AdminButton
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCategoryDialogOpen(false);
                        setEditingCategory(null);
                        categoryForm.reset(defaultCategoryValues);
                      }}>
                      
                      إلغاء
                    </AdminButton>
                    <AdminButton type="submit" icon={editingCategory ? Pencil : Plus}>
                      {editingCategory ? "حفظ التعديلات" : "إنشاء التصنيف"}
                    </AdminButton>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Confirm Dialogs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: open ? deleteDialog.id : null })}
        onConfirm={handleDelete}
        title="حذف الدورة نهائيًا"
        description="سيتم حذف الدورة بشكل دائم إذا لم يكن هناك طلاب مسجلون. هذه العملية لا يمكن التراجع عنها." />
      
      <ConfirmDialog
        open={categoryDeleteDialog.open}
        onOpenChange={(open) =>
        setCategoryDeleteDialog({ open, id: open ? categoryDeleteDialog.id : null })
        }
        onConfirm={handleCategoryDelete}
        title="حذف التصنيف"
        description="سيتم حذف التصنيف إذا لم يكن مرتبطًا بأي دورة."
        confirmText="حذف التصنيف"
        variant="destructive" />
      
    </div>);

}
