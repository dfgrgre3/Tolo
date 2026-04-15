"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Bookmark, Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
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
import { Badge } from "@/components/ui/badge";

interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  coursesCount: number;
  createdAt: string;
}

const categorySchema = z.object({
  name: z.string().min(1, "اسم التصنيف مطلوب"),
  slug: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  description: z.string().optional().nullable()
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const defaultValues: CategoryFormValues = {
  name: "",
  slug: "",
  icon: "",
  description: ""
};

export default function AdminCourseCategoriesPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CourseCategory | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{open: boolean;id: string | null;}>({
    open: false,
    id: null
  });

  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "course-categories", "page"],
    queryFn: async () => {
      const response = await fetch("/api/admin/course-categories");
      const result = await response.json();
      return (result.data?.categories || []) as CourseCategory[];
    }
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues
  });

  const openDialog = (category?: CourseCategory) => {
    if (category) {
      setEditingCategory(category);
      form.reset({
        name: category.name,
        slug: category.slug || "",
        icon: category.icon || "",
        description: category.description || ""
      });
    } else {
      setEditingCategory(null);
      form.reset(defaultValues);
    }

    setDialogOpen(true);
  };

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      const method = editingCategory ? "PATCH" : "POST";
      const payload = editingCategory ? { ...values, id: editingCategory.id } : values;
      const response = await fetch("/api/admin/course-categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error || result?.message || "تعذر حفظ التصنيف");
        return;
      }

      toast.success(editingCategory ? "تم تحديث التصنيف بنجاح" : "تم إنشاء التصنيف بنجاح");
      setDialogOpen(false);
      setEditingCategory(null);
      form.reset(defaultValues);
      await refetch();
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/course-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id })
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error || result?.message || "تعذر حذف التصنيف");
        return;
      }

      toast.success("تم حذف التصنيف بنجاح");
      await refetch();
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<CourseCategory>[] = [
  {
    accessorKey: "name",
    header: "التصنيف",
    cell: ({ row }) =>
    <div className="space-y-1">
          <p className="font-bold">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.slug}</p>
        </div>

  },
  {
    accessorKey: "icon",
    header: "الأيقونة",
    cell: ({ row }) =>
    <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-bold">
          {row.original.icon || "BookOpen"}
        </Badge>

  },
  {
    accessorKey: "coursesCount",
    header: "الدورات",
    cell: ({ row }) => <span className="font-bold">{row.original.coursesCount}</span>
  },
  {
    accessorKey: "description",
    header: "الوصف",
    cell: ({ row }) =>
    <p className="max-w-md truncate text-sm text-muted-foreground">
          {row.original.description || "لا يوجد وصف"}
        </p>

  },
  {
    id: "actions",
    header: "إجراءات",
    cell: ({ row }) =>
    <RowActions
      row={row.original}
      onView={openDialog}
      onEdit={openDialog}
      onDelete={(category) => setDeleteDialog({ open: true, id: category.id })} />


  }];


  return (
    <div className="space-y-8 pb-20" dir="rtl">
      <PageHeader
        title="تصنيفات الدورات"
        description="إدارة التصنيفات المستخدمة لتنظيم الدورات التعليمية داخل المنصة."
        badge={`${categories.length} تصنيف`}>
        
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton variant="outline" icon={RefreshCw} onClick={() => refetch()}>
            تحديث
          </AdminButton>
          <AdminButton icon={Plus} onClick={() => openDialog()}>
            تصنيف جديد
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminCard className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">إجمالي التصنيفات</span>
            <Bookmark className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-black">{categories.length}</p>
        </AdminCard>
        <AdminCard className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">الدورات المرتبطة</span>
            <Bookmark className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="text-3xl font-black">
            {categories.reduce((total, category) => total + category.coursesCount, 0)}
          </p>
        </AdminCard>
        <AdminCard className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">تصنيفات نشطة</span>
            <Bookmark className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black">
            {categories.filter((category) => category.coursesCount > 0).length}
          </p>
        </AdminCard>
      </div>

      <AdminDataTable
        columns={columns}
        data={categories}
        loading={isLoading}
        emptyMessage={{
          title: "لا توجد تصنيفات بعد",
          description: "ابدأ بإضافة تصنيف جديد لتنظيم الدورات التعليمية."
        }} />
      

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            form.reset(defaultValues);
          }
        }}>
        
        <DialogContent className="max-w-2xl rounded-[2rem] p-0">
          <div className="p-6 sm:p-8" dir="rtl">
            <DialogHeader className="space-y-2 text-right">
              <DialogTitle className="text-2xl font-black">
                {editingCategory ? "تعديل تصنيف دورة" : "إضافة تصنيف دورة"}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel>اسم التصنيف</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="مثال: الأحياء" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel>الرابط المختصر</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="biology-courses" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  
                </div>

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel>اسم الأيقونة</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="BookOpen" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel>الوصف</FormLabel>
                      <FormControl>
                        <Textarea
                        {...field}
                        value={field.value || ""}
                        className="min-h-[110px]"
                        placeholder="وصف مختصر للتصنيف." />
                      
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                

                <DialogFooter className="gap-2 sm:justify-start">
                  <AdminButton type="submit" icon={editingCategory ? Pencil : Plus}>
                    {editingCategory ? "حفظ التعديلات" : "إنشاء التصنيف"}
                  </AdminButton>
                  <AdminButton type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
        title="حذف التصنيف"
        description="سيتم حذف التصنيف نهائيًا إذا لم يكن مرتبطًا بأي دورة تعليمية."
        confirmText="حذف التصنيف"
        variant="destructive" />
      
    </div>);

}
