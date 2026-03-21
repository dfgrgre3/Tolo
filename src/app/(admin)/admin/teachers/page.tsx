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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Plus, Edit, Trash2, GraduationCap, ExternalLink } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";

interface Teacher {
  id: string;
  name: string;
  subjectId: string;
  onlineUrl: string | null;
  rating: number;
  notes: string | null;
  createdAt: string;
  subject: {
    name: string;
    nameAr: string | null;
    color: string | null;
  };
}

const teacherSchema = z.object({
  name: z.string().min(1, "اسم المعلم مطلوب"),
  subjectId: z.string().min(1, "المادة الدراسية مطلوبة"),
  onlineUrl: z.string().url("يجب أن يكون رابطاً صحيحاً").or(z.literal("")),
  notes: z.string().optional(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState<Teacher | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: "",
      subjectId: "",
      onlineUrl: "",
      notes: "",
    },
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [teachersRes, subjectsRes] = await Promise.all([
        fetch("/api/admin/teachers"),
        fetch("/api/admin/subjects"),
      ]);
      const teachersData = await teachersRes.json();
      const subjectsData = await subjectsRes.json();
      
      setTeachers(teachersData.teachers || []);
      setSubjects(subjectsData.subjects || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      form.reset({
        name: teacher.name,
        subjectId: teacher.subjectId,
        onlineUrl: teacher.onlineUrl || "",
        notes: teacher.notes || "",
      });
    } else {
      setEditingTeacher(null);
      form.reset({
        name: "",
        subjectId: "",
        onlineUrl: "",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: TeacherFormValues) => {
    try {
      const url = "/api/admin/teachers";
      const method = editingTeacher ? "PATCH" : "POST";
      const body = editingTeacher ? { ...values, id: editingTeacher.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingTeacher ? "تم تحديث المعلم بنجاح" : "تم إنشاء المعلم بنجاح");
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error("حدث خطأ أثناء حفظ بيانات المعلم");
      }
    } catch (error) {
      console.error("Error saving teacher:", error);
      toast.error("حدث خطأ أثناء حفظ بيانات المعلم");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/teachers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف المعلم بنجاح");
        fetchData();
      } else {
        toast.error("حدث خطأ أثناء حذف المعلم");
      }
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast.error("حدث خطأ أثناء حذف المعلم");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Teacher>[] = [
    {
      accessorKey: "name",
      header: "اسم المعلم",
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium text-lg tracking-tight">{teacher.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "المادة",
      cell: ({ row }) => {
        const subject = row.original.subject;
        return (
          <Badge 
            variant="outline" 
            className="font-bold border-2" 
            style={{ 
              borderColor: `${subject.color}40` || "#3b82f640", 
              color: subject.color || "#3b82f6",
              backgroundColor: `${subject.color}10` || "#3b82f610"
            }}
          >
            {subject.nameAr || subject.name}
          </Badge>
        );
      },
    },
    {
      accessorKey: "onlineUrl",
      header: "قناة التواصل",
      cell: ({ row }) => {
        const url = row.getValue("onlineUrl") as string;
        if (!url) return "-";
        return (
          <Button variant="ghost" size="sm" asChild className="gap-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50/50">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              زيارة الرابط
            </a>
          </Button>
        );
      },
    },
    {
      accessorKey: "rating",
      header: "التقييم",
      cell: ({ row }) => {
        const rating = row.getValue("rating") as number;
        return (
          <div className="flex items-center gap-1">
             <span className="font-bold text-lg text-amber-500">{rating}</span>
             <span className="text-xs text-muted-foreground mr-1">/ 5</span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإضافة",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return <span className="text-sm font-medium">{new Date(date).toLocaleDateString("ar-EG")}</span>;
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-2xl">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">خيارات التحكم</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenDialog(teacher)} className="cursor-pointer gap-2 p-2.5 rounded-lg focus:bg-primary/5">
                <Edit className="h-4 w-4 text-primary" />
                <span className="font-medium">تعديل البيانات</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive cursor-pointer gap-2 p-2.5 rounded-lg focus:bg-destructive/5"
                onClick={() => setDeleteDialog({ open: true, id: teacher.id })}
              >
                <Trash2 className="h-4 w-4" />
                <span className="font-medium">حذف المعلم</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="إدارة المعلمين النجوم"
        description="إضافة وتعديل بيانات المعلمين المختصين لكل مادة دراسية على المنصة"
      >
        <Button onClick={() => handleOpenDialog()} className="rounded-xl px-6 py-5 h-auto bg-primary hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 group">
          <Plus className="ml-2 h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
          <span className="font-bold">إضافة معلم جديد</span>
        </Button>
      </PageHeader>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <div className="rounded-[2rem] border bg-card/50 backdrop-blur-xl shadow-2xl shadow-indigo-500/5 overflow-hidden">
          <DataTable
            columns={columns}
            data={teachers}
            searchKey="name"
            searchPlaceholder="البحث عن معلم..."
          />
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-[2.5rem] overflow-hidden border-none p-0 shadow-2xl">
          <div className="h-2 bg-primary" />
          <div className="p-8">
            <DialogHeader className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black">{editingTeacher ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-muted-foreground mt-1">يرجى ملء كافة الحقول لضمان تكامل بيانات المعلم</DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-sm tracking-wide mr-1">اسم المعلم الكامل</FormLabel>
                        <FormControl>
                        <Input {...field} className="rounded-2xl border-2 py-6 focus-visible:ring-0 focus-visible:border-primary transition-all bg-muted/20" placeholder="أدخل اسم المعلم كاملاً" />
                        </FormControl>
                        <FormMessage className="font-bold text-xs" />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="subjectId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-sm tracking-wide mr-1">التخصص الدراسي</FormLabel>
                        <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        >
                        <FormControl>
                            <SelectTrigger className="rounded-2xl border-2 py-6 focus:ring-0 focus:border-primary transition-all bg-muted/20 h-auto">
                            <SelectValue placeholder="اختر المادة الدراسية" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-2 shadow-2xl">
                            {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id} className="cursor-pointer py-3 rounded-lg focus:bg-primary/5">
                                {subject.nameAr || subject.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage className="font-bold text-xs" />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="onlineUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-sm tracking-wide mr-1 text-blue-500">رابط قناة تليجرام أو يوتيوب (اختياري)</FormLabel>
                        <FormControl>
                        <Input {...field} className="rounded-2xl border-2 py-6 focus-visible:ring-0 focus-visible:border-blue-500 transition-all bg-blue-50/5 text-blue-600 font-medium" placeholder="https://..." dir="ltr" />
                        </FormControl>
                        <FormMessage className="font-bold text-xs" />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-sm tracking-wide mr-1">ملاحظات إضافية (اختياري)</FormLabel>
                        <FormControl>
                        <Textarea
                            {...field}
                            className="rounded-2xl border-2 focus-visible:ring-0 focus-visible:border-primary transition-all bg-muted/20 min-h-[120px] resize-none"
                            placeholder="أي تفاصيل أخرى تود إضافتها عن المعلم..."
                        />
                        </FormControl>
                        <FormMessage className="font-bold text-xs" />
                    </FormItem>
                    )}
                />
                <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl py-6 flex-1 font-bold border-2">إلغاء</Button>
                    <Button type="submit" className="rounded-xl py-6 flex-1 font-black shadow-lg shadow-primary/20 tracking-wider">
                    {editingTeacher ? "تحديث البيانات" : "حفظ المعلم"}
                    </Button>
                </DialogFooter>
                </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="تأكيد حذف المعلم"
        description="أنت على وشك حذف بيانات المعلم نهائياً من المنصة. هل تود المتابعة؟"
        confirmText="نعم، حذف المعلم"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
