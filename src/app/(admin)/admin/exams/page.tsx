"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton, IconButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { 
  Plus, Edit, Trash2, ExternalLink, Target, LayoutGrid, List, 
  Search, Filter, FileText, Eye, Calendar, Users, Trophy, RefreshCw
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface Exam {
  id: string;
  title: string;
  year: number;
  url: string;
  type: string | null;
  createdAt: string;
  subject: {
    id: string;
    name: string;
    nameAr: string | null;
  };
  _count: {
    results: number;
  };
}

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
}

const examSchema = z.object({
  title: z.string().min(1, "عنوان الامتحان مطلوب"),
  subjectId: z.string().min(1, "المادة مطلوبة"),
  year: z.number().min(2000).max(2100),
  url: z.string().min(1, "رابط الامتحان مطلوب"),
  type: z.string().optional(),
});

type ExamFormValues = z.infer<typeof examSchema>;

export default function AdminExamsPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingExam, setEditingExam] = React.useState<Exam | null>(null);
  const [previewExam, setPreviewExam] = React.useState<Exam | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const { data: exams = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "exams"],
    queryFn: async () => {
      const response = await fetch("/api/admin/exams");
      const result = await response.json();
      return (result.data?.exams || []) as Exam[];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["admin", "subjects-list"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subjects?limit=100");
      const result = await response.json();
      return (result.data?.subjects || []) as Subject[];
    },
  });

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      subjectId: "",
      year: new Date().getFullYear(),
      url: "",
      type: "",
    },
  });

  const handleOpenDialog = (exam?: Exam) => {
    if (exam) {
      setEditingExam(exam);
      form.reset({
        title: exam.title,
        subjectId: exam.subject.id,
        year: exam.year,
        url: exam.url,
        type: exam.type || "",
      });
    } else {
      setEditingExam(null);
      form.reset({
        title: "",
        subjectId: "",
        year: new Date().getFullYear(),
        url: "",
        type: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: ExamFormValues) => {
    try {
      const method = editingExam ? "PATCH" : "POST";
      const body = editingExam ? { ...values, id: editingExam.id } : values;
      const response = await fetch("/api/admin/exams", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingExam ? "تم تحديث الاختبار الملكي" : "تم إنشاء مبارزة جديدة");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ الاختبار");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch("/api/admin/exams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم مسح السجل من قاعة الاختبارات");
        refetch();
      } else {
        toast.error("فشل في الحذف");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Exam>[] = [
    {
      accessorKey: "title",
      header: "الاختبار / المبارزة",
      cell: ({ row }) => {
        const exam = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{exam.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[8px] font-bold py-0">{exam.year}</Badge>
                <span className="text-[10px] text-muted-foreground font-bold">{exam.type || "عام"}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "المجال العلمي",
      cell: ({ row }) => (
        <Badge variant="secondary" className="rounded-lg bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase">
          {row.original.subject.nameAr || row.original.subject.name}
        </Badge>
      ),
    },
    {
      accessorKey: "results",
      header: "المشاركة الشعبية",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black">{row.original._count.results} محارب اجتاز الاختبار</span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ التدوين",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold">{new Date(row.original.createdAt).toLocaleDateString("ar-EG")}</span>
          <span className="text-[10px] text-muted-foreground">أضيف بواسطة القائد</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "العمليات",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(e) => setDeleteDialog({ open: true, id: e.id })}
          extraActions={[
            { icon: Eye, label: "معاينة الاختبار", onClick: (e) => setPreviewExam(e) },
            { icon: ExternalLink, label: "فتح الرابط المرجعي", onClick: (e) => window.open(e.url, "_blank") },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="قاعة الاختبارات الملكية 🏆"
        description="إدارة المسابقات العلمية، امتحانات السنوات السابقة، وتقييم قدرات المحاربين."
      >
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
          إضافة اختبار جديد
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "إجمالي الاختبارات", value: exams.length, icon: FileText, color: "emerald" },
          { label: "إجمالي المحاولات", value: exams.reduce((acc, e) => acc + e._count.results, 0), icon: Users, color: "blue" },
          { label: "مواد مختبرة", value: Array.from(new Set(exams.map(e => e.subject.id))).length, icon: Target, color: "amber" },
          { label: "اختبارات حديثة", value: exams.filter(e => e.year === 2024).length, icon: Calendar, color: "purple" },
        ].map((stat, i) => (
          <AdminCard key={i} variant="glass" className={`p-6 bg-${stat.color}-500/5 border-${stat.color}-500/10`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      <AdminDataTable
        columns={columns}
        data={exams}
        loading={isLoading}
        searchKey="title"
        searchPlaceholder="ابحث عن عنوان اختبار أو مادة..."
        actions={{ onRefresh: () => refetch() }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card/80 backdrop-blur-xl border-white/10 rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {editingExam ? "تعديل الاختبار" : "صياغة اختبار جديد"}
            </DialogTitle>
            <DialogDescription className="font-bold text-muted-foreground">
              أدخل بيانات الاختبار لضمان دقة التقييم للمحاربين.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">عنوان الاختبار</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl border-white/10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">العلم التابع له</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-white/10">
                            <SelectValue placeholder="اختر المادة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-white/10">
                          {subjects.map((subject: any) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.nameAr || subject.name}
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
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">سنة الإصدار</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))} 
                          className="rounded-xl border-white/10" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">تصنيف الاختبار</FormLabel>
                      <FormControl><Input {...field} placeholder="مثال: تجريبي / نهائي" className="rounded-xl border-white/10" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">الرابط المرجعي (URL)</FormLabel>
                      <FormControl><Input {...field} className="rounded-xl border-white/10" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <AdminButton type="submit" className="w-full h-12 text-md font-black">
                  {editingExam ? "حفظ الاختبار" : "اعتماد الاختبار رسمياً"}
                </AdminButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewExam} onOpenChange={() => setPreviewExam(null)}>
        <DialogContent className="max-w-4xl h-[80vh] bg-card/90 backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black">{previewExam?.title}</h3>
                <p className="text-xs font-bold text-muted-foreground">{previewExam?.subject.nameAr || previewExam?.subject.name} - {previewExam?.year}</p>
              </div>
              <AdminButton variant="outline" size="sm" onClick={() => window.open(previewExam?.url, "_blank")}>
                فتح في نافذة جديدة
              </AdminButton>
            </div>
            <div className="flex-1 bg-white/[0.02]">
              {previewExam?.url && (
                <iframe 
                  src={previewExam.url} 
                  className="w-full h-full border-none shadow-inner" 
                  title="معاينة الاختبار"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف الاختبار من السجلات؟"
        description="سيتم حذف الاختبار ونتائجه بشكل نهائي من قاعدة بيانات المملكة. هل أنت متأكد؟"
        confirmText="نعم، احذف الاختبار"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
