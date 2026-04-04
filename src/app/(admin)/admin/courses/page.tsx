"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Award,
  BookOpen,
  Clock,
  DollarSign,
  ExternalLink,
  Filter,
  GraduationCap,
  LayoutGrid,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminUpload } from "@/components/admin/ui/admin-upload";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { CourseStats } from "@/components/admin/courses/dashboard-stats";
import { CourseCard } from "@/components/admin/courses/course-card";
import { CourseFilters } from "@/components/admin/courses/course-filters";
import { 
  CheckCircle, 
  Copy, 
  Download, 
  MoreHorizontal, 
  PauseCircle, 
  Play, 
  Zap 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  durationHours: number;
  requirements: string | null;
  learningObjectives: string | null;
  _count: {
    enrollments: number;
    topics: number;
    teachers?: number;
  };
}

interface CoursesResponse {
  data: {
    courses: Course[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
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

type FilterKey = "all" | "published" | "draft" | "active" | "inactive";

const categorySchema = z.object({
  name: z.string().min(1, "اسم التصنيف مطلوب"),
  slug: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const courseSchema = z.object({
  name: z.string().min(1, "اسم الدورة بالإنجليزية مطلوب"),
  nameAr: z.string().min(1, "اسم الدورة بالعربية مطلوب"),
  price: z.coerce.number().min(0, "السعر يجب أن يكون صفرًا أو أكثر"),
  level: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]),
  instructorName: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean(),
  isPublished: z.boolean(),
  durationHours: z.coerce.number().min(0, "عدد الساعات يجب أن يكون صفرًا أو أكثر"),
  requirements: z.string().optional().nullable(),
  learningObjectives: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
});

type CourseFormValues = z.infer<typeof courseSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

const levelLabels: Record<string, string> = {
  EASY: "مبتدئ",
  MEDIUM: "متوسط",
  HARD: "متقدم",
  EXPERT: "خبير",
};

const levelStyles: Record<string, string> = {
  EASY: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  MEDIUM: "border-sky-500/20 bg-sky-500/10 text-sky-600",
  HARD: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  EXPERT: "border-rose-500/20 bg-rose-500/10 text-rose-600",
};

const filterOptions: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "كل الدورات" },
  { key: "published", label: "المنشورة" },
  { key: "draft", label: "المسودات" },
  { key: "active", label: "النشطة" },
  { key: "inactive", label: "الموقوفة" },
];

const defaultValues: CourseFormValues = {
  name: "",
  nameAr: "",
  price: 0,
  level: "MEDIUM",
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
};

const defaultCategoryValues: CategoryFormValues = {
  name: "",
  slug: "",
  icon: "",
  description: "",
};

export default function AdminCoursesPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<CourseCategory | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [categoryDeleteDialog, setCategoryDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [activeFilter, setActiveFilter] = React.useState<FilterKey>("all");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [filterLevel, setFilterLevel] = React.useState("ALL");
  const [filterStatus, setFilterStatus] = React.useState("ALL");
  const [filterCategory, setFilterCategory] = React.useState("ALL");
  const deferredCategoryId = React.useDeferredValue(selectedCategoryId);
  const deferredTeacherId = React.useDeferredValue(selectedTeacherId);
  const deferredSearch = React.useDeferredValue(search);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "courses", page, limit, deferredSearch, activeFilter, deferredCategoryId, deferredTeacherId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (deferredSearch) params.set("search", deferredSearch);
      if (activeFilter === "active") params.set("isActive", "true");
      if (activeFilter === "inactive") params.set("isActive", "false");
      if (activeFilter === "published") params.set("isPublished", "true");
      if (activeFilter === "draft") params.set("isPublished", "false");
      if (deferredCategoryId !== "all") params.set("categoryId", deferredCategoryId);
      if (deferredTeacherId !== "all") params.set("instructorId", deferredTeacherId);

      const response = await fetch(`/api/admin/courses?${params.toString()}`);
      return (await response.json()) as CoursesResponse;
    },
  });

  const courses = data?.data?.courses || [];
  const pagination = data?.data?.pagination;

  const { data: teachers = [] } = useQuery({
    queryKey: ["admin", "teachers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/teachers");
      const result = await response.json();
      return (result.data?.teachers || []) as Array<{ id: string; name: string }>;
    },
  });

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["admin", "course-categories"],
    queryFn: async () => {
      const response = await fetch("/api/admin/course-categories");
      const result = await response.json();
      return (result.data?.categories || []) as CourseCategory[];
    },
  });

  const memoizedCourses = React.useMemo(() => courses, [courses]);

  const totalEnrollments = React.useMemo(
    () => memoizedCourses.reduce((total, course) => total + (course._count?.enrollments || 0), 0),
    [memoizedCourses]
  );
  const totalCurriculumUnits = React.useMemo(
    () => memoizedCourses.reduce((total, course) => total + (course._count?.topics || 0), 0),
    [memoizedCourses]
  );
  const totalHours = React.useMemo(
    () => memoizedCourses.reduce((total, course) => total + (course.durationHours || 0), 0),
    [memoizedCourses]
  );
  const publishedCoursesCount = React.useMemo(
    () => memoizedCourses.filter((course) => course.isPublished).length,
    [memoizedCourses]
  );
  const activeCoursesCount = React.useMemo(
    () => memoizedCourses.filter((course) => course.isActive).length,
    [memoizedCourses]
  );
  const averagePrice = React.useMemo(() => {
    if (!memoizedCourses.length) return 0;
    const total = memoizedCourses.reduce((sum, course) => sum + (course.price || 0), 0);
    return Math.round(total / memoizedCourses.length);
  }, [memoizedCourses]);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues,
  });
  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultCategoryValues,
  });

  const selectedInstructorId = form.watch("instructorId");
  const previewThumbnail = form.watch("thumbnailUrl");
  const previewName = form.watch("nameAr") || form.watch("name") || "دورة جديدة";
  const previewDescription = form.watch("description") || "أضف وصفًا مختصرًا يوضح قيمة الدورة للطلاب.";
  const previewLevel = form.watch("level");
  const previewPrice = form.watch("price");
  const previewDuration = form.watch("durationHours");
  const previewPublished = form.watch("isPublished");
  const previewActive = form.watch("isActive");
  React.useEffect(() => {
    if (!selectedInstructorId) {
      form.setValue("instructorName", "");
      return;
    }

    const teacher = teachers.find((item) => item.id === selectedInstructorId);
    if (teacher) {
      form.setValue("instructorName", teacher.name);
    }
  }, [selectedInstructorId, teachers, form]);

  React.useEffect(() => {
    setPage(1);
  }, [activeFilter, deferredCategoryId, deferredTeacherId, deferredSearch]);

  const openDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      form.reset({
        name: course.name,
        nameAr: course.nameAr || "",
        price: course.price || 0,
        level: (course.level as CourseFormValues["level"]) || "MEDIUM",
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
      });
    } else {
      setEditingCourse(null);
      form.reset(defaultValues);
    }

    setDialogOpen(true);
  };

  const openCategoryDialog = (category?: CourseCategory) => {
    if (category) {
      setEditingCategory(category);
      categoryForm.reset({
        name: category.name,
        slug: category.slug || "",
        icon: category.icon || "",
        description: category.description || "",
      });
    } else {
      setEditingCategory(null);
      categoryForm.reset(defaultCategoryValues);
    }

    setCategoryDialogOpen(true);
  };

  const handleSubmit = async (values: CourseFormValues) => {
    try {
      const method = editingCourse ? "PATCH" : "POST";
      const payload = editingCourse ? { ...values, id: editingCourse.id } : values;

      const response = await fetch("/api/admin/courses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.message || result?.error || "تعذر حفظ بيانات الدورة");
        return;
      }

      toast.success(editingCourse ? "تم تحديث الدورة بنجاح" : "تم إنشاء الدورة بنجاح");
      setDialogOpen(false);
      setEditingCourse(null);
      form.reset(defaultValues);
      await refetch();
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/courses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (!response.ok) {
        toast.error("تعذر حذف الدورة");
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

  const handleCategorySubmit = async (values: CategoryFormValues) => {
    try {
      const method = editingCategory ? "PATCH" : "POST";
      const payload = editingCategory ? { ...values, id: editingCategory.id } : values;

      const response = await fetch("/api/admin/course-categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error || result?.message || "تعذر حفظ التصنيف");
        return;
      }

      toast.success(editingCategory ? "تم تحديث التصنيف بنجاح" : "تم إنشاء التصنيف بنجاح");
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
      const response = await fetch("/api/admin/course-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryDeleteDialog.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error || result?.message || "تعذر حذف التصنيف");
        return;
      }

      if (selectedCategoryId === categoryDeleteDialog.id) {
        setSelectedCategoryId("all");
      }

      toast.success("تم حذف التصنيف بنجاح");
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
        body: JSON.stringify({ courseId: course.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "فشل الاستنساخ");
      toast.success(result.message || "تم استنساخ الدورة بنجاح");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    }
  };

  const handleBatchAction = async (action: "publish" | "unpublish" | "activate" | "deactivate" | "delete") => {
    if (selectedIds.length === 0) return;
    try {
      const response = await fetch("/api/admin/courses/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action }),
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

  const statsData = React.useMemo(() => {
    const totalEnrollments = courses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0);
    const totalRevenue = courses.reduce((sum, c) => sum + (c.price * (c._count?.enrollments || 0)), 0);
    return {
      totalEnrollments,
      totalRevenue,
      activeStudents: Math.round(totalEnrollments * 0.7), // Mock calculation for demo
      avgCompletion: 65, // Mock calculation for demo
      growth: {
        enrollments: 12,
        revenue: 8
      }
    };
  }, [courses]);

  const columns: ColumnDef<Course>[] = [
    {
      accessorKey: "name",
      id: "nameAr",
      header: "الدورة",
      cell: ({ row }) => {
        const course = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-24 overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500/10 to-indigo-500/10">
                  <PlayCircle className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-bold">{course.nameAr || course.name}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {course.instructorName || "بدون مدرس"}
                </span>
                {course.code && <span>#{course.code}</span>}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: "السعر",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm font-bold text-primary">
          <DollarSign className="h-3.5 w-3.5" />
          {row.original.price || 0} EGP
        </div>
      ),
    },
    {
      accessorKey: "durationHours",
      header: "المدة",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {row.original.durationHours || 0} ساعة
        </div>
      ),
    },
    {
      id: "enrollments",
      header: "الملتحقون",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm font-bold">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {row.original._count?.enrollments || 0}
        </div>
      ),
    },
    {
      id: "topics",
      header: "المحتوى",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm font-bold">
          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
          {row.original._count?.topics || 0} وحدة
        </div>
      ),
    },
    {
      accessorKey: "level",
      header: "المستوى",
      cell: ({ row }) => {
        const level = (row.original.level || "MEDIUM") as string;
        return (
          <Badge
            variant="outline"
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${levelStyles[level] || levelStyles.MEDIUM}`}
          >
            {levelLabels[level] || level}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isPublished",
      header: "النشر",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            row.original.isPublished
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
              : "border-border/60 bg-muted/30 text-muted-foreground"
          }`}
        >
          {row.original.isPublished ? "منشورة" : "مسودة"}
        </Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "default" : "secondary"}
          className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
        >
          {row.original.isActive ? "نشطة" : "موقوفة"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "إجراءات",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onView={(course) => router.push(`/admin/courses/${course.id}`)}
          onEdit={(course) => openDialog(course)}
          onDelete={(course) => setDeleteDialog({ open: true, id: course.id })}
          extraActions={[
            {
              icon: BookOpen,
              label: "إدارة المنهج",
              onClick: (course) => router.push(`/admin/courses/${course.id}/curriculum`),
            },
            {
              icon: TrendingUp,
              label: "التحليلات",
              onClick: (course) => router.push(`/admin/courses/${course.id}/analytics`),
            },
            {
              icon: ExternalLink,
              label: "عرض في الموقع",
              onClick: (course) => router.push(`/courses/${course.id}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      <PageHeader
        title="إدارة الدورات التعليمية"
        description="أنشئ الدورات، راقب حالة النشر، ووجّه فريق المحتوى بسرعة من شاشة تشغيل واحدة."
        badge={`${pagination?.total || courses.length} دورة`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton variant="outline" icon={RefreshCw} onClick={() => refetch()}>
            تحديث
          </AdminButton>
          <AdminButton variant="outline" icon={Tags} onClick={() => setCategoryDialogOpen(true)}>
            إدارة التصنيفات
          </AdminButton>
          <AdminButton icon={Plus} onClick={() => setDialogOpen(true)}>
            دورة جديدة
          </AdminButton>
        </div>
      </PageHeader>

      {/* Dashboard Stats & Filters will be placed here */}

      <CourseStats stats={statsData} />

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
        onAddCourse={() => openDialog()}
      />

      {view === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {courses.map((course) => (
            <CourseCard 
              key={course.id}
              course={course}
              onEdit={(c) => {
                setEditingCourse(c);
                form.reset({
                  ...c,
                  categoryId: c.categoryId || "",
                  instructorId: c.instructorId || "",
                });
                setDialogOpen(true);
              }}
              onDuplicate={handleDuplicate}
              onDelete={(c) => setDeleteDialog({ open: true, id: c.id })}
              onToggleStatus={async (c) => {
                 // Fast toggle logic
                 try {
                   await fetch("/api/admin/courses", {
                     method: "PATCH",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ id: c.id, isPublished: !c.isPublished })
                   });
                   await refetch();
                   toast.success("تم تحديث الحالة");
                 } catch {
                   toast.error("فشل التحديث");
                 }
              }}
            />
          ))}
          {courses.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center">
               <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
               <p className="text-muted-foreground font-bold">لا توجد دورات مطابقة للبحث</p>
            </div>
          )}
        </div>
      ) : (
        <AdminDataTable
          columns={columns}
          data={courses}
          loading={isLoading}
          serverSide
          totalRows={pagination?.total || 0}
          pageCount={pagination?.totalPages || 1}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          pageSize={limit}
          actions={{ onRefresh: () => refetch() }}
          emptyMessage={{
            title: "لا توجد دورات مطابقة",
            description: "جرّب تغيير الفلاتر أو أنشئ دورة جديدة لبدء المحتوى.",
          }}
          toolbar={
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
               {selectedIds.length > 0 && (
                 <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 animate-in zoom-in duration-300">
                    <span className="font-bold text-primary">{selectedIds.length} مختارة:</span>
                    <AdminButton variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold" onClick={() => handleBatchAction("publish")}>نشر</AdminButton>
                    <AdminButton variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold" onClick={() => handleBatchAction("unpublish")}>إخفاء</AdminButton>
                    <AdminButton variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold text-red-500" onClick={() => handleBatchAction("delete")}>حذف</AdminButton>
                 </div>
               )}
               <AdminButton variant="outline" size="sm" className="h-9 rounded-xl gap-2 font-bold" onClick={handleExport}>
                 <Download className="h-4 w-4" />
                 تصدير الكل
               </AdminButton>
            </div>
          }
        />
      )}

      {/* Removed old toolbar stuff */}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingCourse(null);
            form.reset(defaultValues);
          }
        }}
      >
        <DialogContent className="max-w-5xl rounded-[2rem] p-0">
          <div className="grid max-h-[88vh] gap-0 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
            <div className="overflow-y-auto p-6 sm:p-8" dir="rtl">
              <DialogHeader className="space-y-2 text-right">
                <DialogTitle className="text-2xl font-black">
                  {editingCourse ? "تعديل الدورة" : "إضافة دورة جديدة"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  أدخل البيانات الأساسية أولًا، ثم أضف الوسائط والمتطلبات قبل النشر.
                </p>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nameAr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم الدورة بالعربية</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="مثال: أساسيات اللغة العربية" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم الدورة بالإنجليزية</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Arabic Foundations" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            className="min-h-[110px]"
                            placeholder="ملخص واضح لما سيتعلمه الطالب داخل الدورة."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="requirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المتطلبات</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder={"اكتب كل متطلب في سطر منفصل"}
                              className="min-h-[120px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="learningObjectives"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مخرجات التعلم</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder={"اكتب كل هدف تعليمي في سطر منفصل"}
                              className="min-h-[120px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>السعر</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="durationHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عدد الساعات</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المستوى</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EASY">مبتدئ</SelectItem>
                              <SelectItem value="MEDIUM">متوسط</SelectItem>
                              <SelectItem value="HARD">متقدم</SelectItem>
                              <SelectItem value="EXPERT">خبير</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="instructorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المدرس</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر المدرس" />
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
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التصنيف</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر التصنيف" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="thumbnailUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>صورة الدورة</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <Input {...field} value={field.value || ""} placeholder="رابط مباشر للصورة" />
                              <AdminUpload
                                accept="image/*"
                                label="رفع صورة من الجهاز"
                                onUploadComplete={(url) => field.onChange(url)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="trailerUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>فيديو تعريفي</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <Input {...field} value={field.value || ""} placeholder="رابط فيديو مباشر أو يوتيوب" />
                              <AdminUpload
                                accept="video/*"
                                label="رفع فيديو من الجهاز"
                                onUploadComplete={(url) => field.onChange(url)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-3xl border bg-muted/20 p-4">
                      <div className="space-y-1">
                        <p className="font-bold">الحالة</p>
                        <p className="text-xs text-muted-foreground">عند إيقافها لن تظهر ضمن التشغيل المعتاد.</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        )}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-3xl border bg-muted/20 p-4">
                      <div className="space-y-1">
                        <p className="font-bold">النشر</p>
                        <p className="text-xs text-muted-foreground">فعّل النشر عندما تكون الدورة جاهزة للطلاب.</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="isPublished"
                        render={({ field }) => (
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        )}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <AdminButton type="submit" className="h-12 w-full text-base font-black" icon={RefreshCw}>
                      {editingCourse ? "حفظ التعديلات" : "إنشاء الدورة"}
                    </AdminButton>
                  </DialogFooter>
                </form>
              </Form>
            </div>

            <div className="border-r bg-muted/20 p-6 sm:p-8" dir="rtl">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    معاينة سريعة
                  </p>
                  <h3 className="mt-2 text-2xl font-black">{previewName}</h3>
                </div>

                <div className="overflow-hidden rounded-[1.75rem] border bg-background">
                  <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-sky-500/10 via-background to-indigo-500/10">
                    {previewThumbnail ? (
                      <img src={previewThumbnail} alt={previewName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <PlayCircle className="h-12 w-12 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={`rounded-full ${levelStyles[previewLevel] || levelStyles.MEDIUM}`}>
                        {levelLabels[previewLevel] || previewLevel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={previewPublished ? "rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "rounded-full"}
                      >
                        {previewPublished ? "منشورة" : "مسودة"}
                      </Badge>
                      <Badge variant={previewActive ? "default" : "secondary"} className="rounded-full">
                        {previewActive ? "نشطة" : "موقوفة"}
                      </Badge>
                    </div>

                    <p className="text-sm leading-7 text-muted-foreground">{previewDescription}</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-muted/40 p-4">
                        <p className="text-[11px] font-bold text-muted-foreground">السعر</p>
                        <p className="mt-2 text-lg font-black">{previewPrice || 0} EGP</p>
                      </div>
                      <div className="rounded-2xl bg-muted/40 p-4">
                        <p className="text-[11px] font-bold text-muted-foreground">المدة</p>
                        <p className="mt-2 text-lg font-black">{previewDuration || 0} ساعة</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-dashed bg-background p-5">
                  <p className="text-sm font-bold">توصية تشغيل</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    قبل النشر، تأكد من وجود مدرس مرتبط، وصف واضح، وصورة مناسبة حتى تظهر الدورة بشكل مكتمل في صفحة التعليم.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            categoryForm.reset(defaultCategoryValues);
          }
        }}
      >
        <DialogContent className="max-w-2xl rounded-[2rem] p-0">
          <div className="p-6 sm:p-8" dir="rtl">
            <DialogHeader className="space-y-2 text-right">
              <DialogTitle className="text-2xl font-black">
                {editingCategory ? "تعديل تصنيف دورة" : "إضافة تصنيف دورة"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                استخدم التصنيفات لتنظيم الدورات التعليمية وتسهيل الفرز داخل لوحة الأدمن وواجهة الطالب.
              </p>
            </DialogHeader>

            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم التصنيف</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="مثال: الأحياء" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={categoryForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الرابط المختصر</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="biology-courses" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={categoryForm.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الأيقونة</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="BookOpen" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="rounded-3xl border bg-muted/20 p-4">
                    <p className="text-xs font-bold text-muted-foreground">عدد الدورات المرتبطة</p>
                    <p className="mt-2 text-3xl font-black">{editingCategory?.coursesCount ?? 0}</p>
                  </div>
                </div>
                <FormField
                  control={categoryForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الوصف</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          className="min-h-[110px]"
                          placeholder="وصف مختصر يساعد فريق المحتوى على فهم استخدام هذا التصنيف."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-2 sm:justify-start">
                  <AdminButton type="submit" icon={editingCategory ? Pencil : Plus}>
                    {editingCategory ? "حفظ التعديلات" : "إنشاء التصنيف"}
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCategoryDialogOpen(false);
                      setEditingCategory(null);
                      categoryForm.reset(defaultCategoryValues);
                    }}
                  >
                    إلغاء
                  </AdminButton>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: open ? deleteDialog.id : null })}
        onConfirm={handleDelete}
        title="حذف الدورة"
        description="سيتم حذف الدورة نهائيًا إذا لم تكن مرتبطة بطلاب أو سجلات تمنع ذلك."
      />
      <ConfirmDialog
        open={categoryDeleteDialog.open}
        onOpenChange={(open) => setCategoryDeleteDialog({ open, id: open ? categoryDeleteDialog.id : null })}
        onConfirm={handleCategoryDelete}
        title="حذف التصنيف"
        description="سيتم حذف التصنيف نهائيًا إذا لم يكن مرتبطًا بأي دورة تعليمية."
        confirmText="حذف التصنيف"
        variant="destructive"
      />
    </div>
  );
}
