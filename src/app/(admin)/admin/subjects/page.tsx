"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { DataTable } from "@/components/admin/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { MoreHorizontal, Plus, Edit, Trash2, BookOpen, LayoutGrid, List, GripVertical, Users, FileText, Target, Gift, GraduationCap, Search, Filter } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
  code: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  type: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    books: number;
    exams: number;
    resources: number;
    topics: number;
    enrollments: number;
    teachers: number;
  };
}

const subjectSchema = z.object({
  name: z.string().min(1, "اسم المادة مطلوب"),
  nameAr: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.string().optional(),
  isActive: z.boolean(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("");

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      code: "",
      description: "",
      icon: "",
      color: "",
      type: "",
      isActive: true,
    },
  });

  const fetchSubjects = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/subjects");
      const data: ApiResponse<{ subjects: Subject[] }> = await response.json();
      if (!response.ok || !data?.data) {
        throw new Error("Failed to fetch subjects");
      }
      setSubjects(Array.isArray(data.data.subjects) ? data.data.subjects : []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("حدث خطأ أثناء جلب المواد");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      form.reset({
        name: subject.name,
        nameAr: subject.nameAr || "",
        code: subject.code || "",
        description: subject.description || "",
        icon: subject.icon || "",
        color: subject.color || "",
        type: subject.type || "",
        isActive: subject.isActive,
      });
    } else {
      setEditingSubject(null);
      form.reset({
        name: "",
        nameAr: "",
        code: "",
        description: "",
        icon: "",
        color: "",
        type: "",
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: SubjectFormValues) => {
    try {
      const url = "/api/admin/subjects";
      const method = editingSubject ? "PATCH" : "POST";
      const body = editingSubject ? { ...values, id: editingSubject.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingSubject ? "تم تحديث المادة بنجاح" : "تم إنشاء المادة بنجاح");
        setDialogOpen(false);
        fetchSubjects();
      } else {
        toast.error("حدث خطأ أثناء حفظ المادة");
      }
    } catch (error) {
      console.error("Error saving subject:", error);
      toast.error("حدث خطأ أثناء حفظ المادة");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/subjects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف المادة بنجاح");
        fetchSubjects();
      } else {
        toast.error("حدث خطأ أثناء حذف المادة");
      }
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("حدث خطأ أثناء حذف المادة");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Subject>[] = [
    {
      accessorKey: "name",
      header: "المادة",
      cell: ({ row }) => {
        const subject = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: subject.color || "#3b82f6" }}
            >
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium">{subject.name}</p>
              {subject.nameAr && (
                <p className="text-sm text-muted-foreground">{subject.nameAr}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "code",
      header: "الكود",
      cell: ({ row }) => row.getValue("code") || "-",
    },
    {
      accessorKey: "type",
      header: "النوع",
      cell: ({ row }) => row.getValue("type") || "-",
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "نشط" : "معطل"}
          </Badge>
        );
      },
    },
    {
      id: "stats",
      header: "الإحصائيات",
      cell: ({ row }) => {
        const subject = row.original;
        return (
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>{subject._count.books} كتاب</span>
            <span>{subject._count.exams} امتحان</span>
            <span>{subject._count.enrollments} مسجل</span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإنشاء",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return new Date(date).toLocaleDateString("ar-EG");
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const subject = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenDialog(subject)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: subject.id })}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Subject Card for Grid View
  const SubjectCard = ({ subject }: { subject: Subject }) => (
    <Card className="group hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden">
      <div 
        className="h-2"
        style={{ backgroundColor: subject.color || "#3b82f6" }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: subject.color || "#3b82f6" }}
            >
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold">{subject.name}</p>
              {subject.nameAr && (
                <p className="text-sm text-muted-foreground">{subject.nameAr}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenDialog(subject)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog({ open: true, id: subject.id })}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant={subject.isActive ? "default" : "secondary"}>
            {subject.isActive ? "نشط" : "معطل"}
          </Badge>
          {subject.type && (
            <Badge variant="outline">{subject.type}</Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="font-bold text-primary">{subject._count.books}</p>
            <p className="text-xs text-muted-foreground">كتاب</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="font-bold text-primary">{subject._count.exams}</p>
            <p className="text-xs text-muted-foreground">امتحان</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="font-bold text-primary">{subject._count.enrollments}</p>
            <p className="text-xs text-muted-foreground">مسجل</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Filter subjects
  const filteredSubjects = React.useMemo(() => {
    return (Array.isArray(subjects) ? subjects : []).filter(subject => {
      const matchesSearch = !searchQuery || 
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (subject.nameAr?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = !typeFilter || subject.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [subjects, searchQuery, typeFilter]);

  // Get unique types for filter
  const uniqueTypes = React.useMemo(() => {
    const types = subjects.map(s => s.type).filter(Boolean) as string[];
    return [...new Set(types)];
  }, [subjects]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المواد الدراسية"
        description="عرض وإدارة جميع المواد الدراسية في الموقع"
      >
        <Button onClick={() => handleOpenDialog()} size="sm" className="rounded-lg">
          <Plus className="ml-2 h-4 w-4" />
          إضافة مادة
        </Button>
      </PageHeader>

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث عن مادة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 w-64 h-9 rounded-lg"
            />
          </div>
          {uniqueTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">كل الأنواع</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          )}
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-7 px-2"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-7 px-2"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي المواد", value: subjects.length, icon: BookOpen, color: "text-primary" },
          { label: "مواد نشطة", value: subjects.filter(s => s.isActive).length, icon: Target, color: "text-green-500" },
          { label: "إجمالي الكتب", value: subjects.reduce((acc, s) => acc + s._count.books, 0), icon: FileText, color: "text-blue-500" },
          { label: "إجمالي المسجلين", value: subjects.reduce((acc, s) => acc + s._count.enrollments, 0), icon: Users, color: "text-purple-500" },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : viewMode === "table" ? (
        <DataTable
          columns={columns}
          data={filteredSubjects}
          searchKey="name"
          searchPlaceholder="البحث عن مادة..."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSubjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? "تعديل المادة" : "إضافة مادة جديدة"}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات المادة الدراسية
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المادة *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم بالعربية</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكود</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>النوع</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اللون</FormLabel>
                      <FormControl>
                        <Input type="color" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>نشط</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingSubject ? "تحديث" : "إنشاء"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف المادة"
        description="هل أنت متأكد من حذف هذه المادة؟ سيتم حذف جميع الكتب والامتحانات المرتبطة بها."
        confirmText="حذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
