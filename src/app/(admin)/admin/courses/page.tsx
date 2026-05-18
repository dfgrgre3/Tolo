"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import {
  BookOpen,
  CheckCircle2,
  DollarSign,
  Plus,
  Tags,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { CourseFilters } from "@/components/admin/courses/course-filters";
import { CourseContentView } from "@/components/admin/courses/course-content-view";
import { CourseBulkActions } from "@/components/admin/courses/course-bulk-actions";
import { CoursePagination } from "@/components/admin/courses/course-pagination";
import { CourseEmptyState } from "@/components/admin/courses/course-empty-state";
import { cn, formatPrice } from "@/lib/utils";
import { apiRoutes } from "@/lib/api/routes";
import { adminFetch } from "@/lib/api/admin-api";
import { usePermission } from "@/components/auth/PermissionGuard";
import { readJsonOrThrow, throwIfApiError } from "@/lib/api/api-error-utils";
import type { Course, CourseCategory } from "./_components/types";
import { createCourseColumns } from "./_components/course-columns";
import { CourseFormDialog, QuickCourseValues, quickCourseSchema, quickCourseDefaults } from "./_components/course-form-dialog";
import { CategoryDialog, CategoryFormValues, categorySchema, defaultCategoryValues } from "./_components/category-dialog";

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

export default function AdminCoursesPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canManageCourses = hasPermission("SUBJECTS_MANAGE");

  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<CourseCategory | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null; }>({
    open: false,
    id: null
  });
  const [categoryDeleteDialog, setCategoryDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [selectedCategoryId] = React.useState<string>("all");
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

      if (filterStatus === "PUBLISHED") params.set("isPublished", "true"); else
        if (filterStatus === "DRAFT") params.set("isPublished", "false"); else
          if (filterStatus === "ACTIVE") params.set("isActive", "true"); else
            if (filterStatus === "INACTIVE") params.set("isActive", "false");

      const response = await adminFetch(`${apiRoutes.admin.courses}?${params.toString()}`);
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
      const response = await adminFetch(apiRoutes.admin.teachers);
      const result = await response.json();
      return (result.data?.teachers || []) as Array<{ id: string; name: string; }>;
    },
    staleTime: 300_000
  });

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["admin", "course-categories"],
    queryFn: async () => {
      const response = await adminFetch(apiRoutes.admin.courseCategories);
      const result = await response.json();
      return (result.data?.categories || []) as CourseCategory[];
    },
    staleTime: 300_000
  });

  const quickForm = useForm<QuickCourseValues>({
    resolver: zodResolver(quickCourseSchema) as Resolver<QuickCourseValues>,
    defaultValues: quickCourseDefaults
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema) as Resolver<CategoryFormValues>,
    defaultValues: defaultCategoryValues
  });

  const selectedInstructorId = quickForm.watch("instructorId");
  React.useEffect(() => {
    if (!selectedInstructorId) return;
    const teacher = teachers.find((t) => t.id === selectedInstructorId);
    if (teacher) quickForm.setValue("instructorName", teacher.name);
  }, [selectedInstructorId, teachers, quickForm]);

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch, filterLevel, filterStatus, filterCategory]);

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
      const response = await adminFetch(apiRoutes.admin.courses, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await readJsonOrThrow<{
        data?: { course?: { id?: string } };
      }>(response, "تعذر حفظ بيانات الدورة");
      const createdCourseId = result?.data?.course?.id as string | undefined;
      toast.success(
        editingCourse ?
          "تم تحديث الدورة بنجاح" :
          "تم إنشاء الدورة وسيتم توجيهك لإضافة المنهج الدراسي"
      );
      setQuickCreateOpen(false);
      setEditingCourse(null);
      quickForm.reset(quickCourseDefaults);
      await refetch();
      if (!editingCourse && createdCourseId) {
        router.push(`/admin/courses/${createdCourseId}/curriculum`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await adminFetch(apiRoutes.admin.courses, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id })
      });
      await throwIfApiError(response, "تعذر حذف الدورة");
      toast.success("تم حذف الدورة بنجاح");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleToggleStatus = async (course: Course) => {
    try {
      const response = await adminFetch(apiRoutes.admin.courses, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: course.id, isPublished: !course.isPublished })
      });
      await throwIfApiError(response, "فشل تحديث الحالة");
      toast.success(course.isPublished ? "تم إخفاء الدورة" : "تم نشر الدورة بنجاح");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل تحديث الحالة");
    }
  };

  const handleCategorySubmit = async (values: CategoryFormValues) => {
    try {
      const method = editingCategory ? "PATCH" : "POST";
      const payload = editingCategory ? { ...values, id: editingCategory.id } : values;
      const response = await adminFetch(apiRoutes.admin.courseCategories, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await throwIfApiError(response, "تعذر حفظ التصنيف");
      toast.success(editingCategory ? "تم تحديث التصنيف" : "تم إنشاء التصنيف");
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset(defaultCategoryValues);
      await refetchCategories();
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  const handleCategoryDelete = async () => {
    if (!categoryDeleteDialog.id) return;
    try {
      const response = await adminFetch(apiRoutes.admin.courseCategories, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryDeleteDialog.id })
      });
      await throwIfApiError(response, "تعذر حذف التصنيف");
      toast.success("تم حذف التصنيف");
      await refetchCategories();
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setCategoryDeleteDialog({ open: false, id: null });
    }
  };

  const handleDuplicate = async (course: Course) => {
    try {
      const response = await adminFetch("/api/admin/courses/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id })
      });
      const result = await readJsonOrThrow<{ message?: string }>(response, "فشل الاستنساخ");
      toast.success(result.message || "تم استنساخ الدورة بنجاح");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    }
  };

  const _handleToggleActive = async (course: Course) => {
    try {
      const response = await adminFetch("/api/admin/courses", {
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
    action: "publish" | "unpublish" | "activate" | "deactivate" | "delete") => {
    if (selectedIds.length === 0) return;
    try {
      const response = await adminFetch("/api/admin/courses/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action })
      });
      const result = await readJsonOrThrow<{ message?: string }>(response, "فشلت العملية الجماعية");
      toast.success(result.message || "تم تنفيذ العملية الجماعية");
      setSelectedIds([]);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    }
  };

  const handleExport = () => {
    window.open("/api/admin/courses/export", "_blank");
  };

  const columns = React.useMemo(
    () => createCourseColumns({ router, canManageCourses, setDeleteDialog }),
    [router, canManageCourses, setDeleteDialog]
  );

  const emptyState = (
    <CourseEmptyState onAddCourse={() => router.push("/admin/courses/new")} />
  );

  return (
    <div className="space-y-8" dir="rtl">
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

          {canManageCourses && <div className="flex flex-wrap items-center justify-center gap-3">
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
          </div>}
        </div>

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

      <CourseBulkActions
        selectedCount={selectedIds.length}
        onPublish={() => handleBatchAction("publish")}
        onUnpublish={() => handleBatchAction("unpublish")}
        onActivate={() => handleBatchAction("activate")}
        onDeactivate={() => handleBatchAction("deactivate")}
        onDelete={() => handleBatchAction("delete")}
        onExport={handleExport}
        onClear={() => setSelectedIds([])}
      />

      <CourseContentView
        view={view}
        isLoading={isLoading}
        courses={courses}
        emptyState={emptyState}
        canManageCourses={canManageCourses}
        columns={columns}
        pagination={pagination}
        totalPages={totalPages}
        page={page}
        limit={limit}
        setPage={setPage}
        setLimit={setLimit}
        setSelectedIds={setSelectedIds}
        handleBatchAction={handleBatchAction}
        handleDuplicate={handleDuplicate}
        handleToggleStatus={handleToggleStatus}
        handleExport={handleExport}
        refetch={refetch}
        router={router}
        setDeleteDialog={setDeleteDialog}
      />

      {view === "grid" && (
        <CoursePagination
          page={page}
          totalPages={totalPages}
          total={pagination?.total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      <CourseFormDialog
        open={quickCreateOpen}
        onOpenChange={(open) => {
          setQuickCreateOpen(open);
          if (!open) {
            setEditingCourse(null);
            quickForm.reset(quickCourseDefaults);
          }
        }}
        editingCourse={editingCourse}
        isSubmitting={isSubmitting}
        teachers={teachers}
        categories={categories}
        quickForm={quickForm}
        onSubmit={handleQuickSubmit}
        onFullEditor={(courseId) => router.push(`/admin/courses/${courseId}`)}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            categoryForm.reset(defaultCategoryValues);
          }
        }}
        editingCategory={editingCategory}
        categoryForm={categoryForm}
        onSubmit={handleCategorySubmit}
        onDeleteRequest={(category) => {
          setCategoryDeleteDialog({ open: true, id: category.id });
          setCategoryDialogOpen(false);
        }}
      />

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

    </div>
  );

}
