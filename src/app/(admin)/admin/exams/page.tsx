"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { 
  Plus, ExternalLink, Target, 
  FileText, Eye, Calendar, Users, Trophy, Search, UploadCloud, Hammer, Send
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
import { BulkUploadDialog } from "@/components/admin/exams/bulk-upload-dialog";
import { motion } from "framer-motion";

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

interface ExamsResponse {
  data: {
    exams: Exam[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const examSchema = z.object({
  title: z.string().min(1, "عنوان الامتحان مطلوب"),
  subjectId: z.string().min(1, "المادة مطلوبة"),
  year: z.coerce.number().min(2000).max(2100),
  url: z.string().min(1, "رابط الامتحان مطلوب"),
  type: z.string().optional(),
});

type ExamFormValues = z.infer<typeof examSchema>;

export default function AdminExamsPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingExam, setEditingExam] = React.useState<Exam | null>(null);
  const [previewExam, setPreviewExam] = React.useState<Exam | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);


  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "exams", page, limit, deferredSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (deferredSearch) {
        params.set("search", deferredSearch);
      }

      const response = await fetch(`/api/admin/exams?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch exams");
      return (await response.json()) as ExamsResponse;
    },
  });

  const exams = data?.data?.exams || [];
  const pagination = data?.data?.pagination;

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

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
        toast.success(editingExam ? "تم تحديث مخطط المبارزة" : "تم تعبئة مبارزة جديدة بنجاح");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ الاختبار");
      }
    } catch (_error) {
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
        toast.success("تم إتلاف المخطوطة من السجلات");
        refetch();
      } else {
        toast.error("فشل في الحذف");
      }
    } catch (_error) {
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
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-transform hover:scale-110">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{exam.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] font-black py-0 h-5 px-2 bg-white/5 border-primary/20">{exam.year}</Badge>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 italic">{exam.type || "عام"}</span>
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
        <Badge variant="outline" className="rounded-lg bg-white/5 text-primary border-primary/20 font-black text-[10px] uppercase px-3 py-1">
          {row.original.subject.nameAr || row.original.subject.name}
        </Badge>
      ),
    },
    {
      accessorKey: "results",
      header: "المشاركة الشعبية",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-black">{row.original._count.results} محارب اجتازها</span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ التدوين",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-black">{new Date(row.original.createdAt).toLocaleDateString("ar-EG")}</span>
          <span className="text-[10px] text-muted-foreground font-bold italic opacity-60">سجل ملكي</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "العمليات الملكية",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(e) => setDeleteDialog({ open: true, id: e.id })}
          extraActions={[
            { icon: Eye, label: "معاينة المبارزة", onClick: (e) => setPreviewExam(e) },
            { icon: ExternalLink, label: "الرابط المرجعي", onClick: (e) => window.open(e.url, "_blank") },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="قاعة الاختبارات الملكية ًںڈ†"
        description="إدارة المسابقات العلمية، امتحانات السنوات السابقة، وتقييم قدرات المحاربين."
      >
        <div className="flex items-center gap-3">
          <AdminButton 
            variant="outline" 
            icon={UploadCloud} 
            onClick={() => setBulkDialogOpen(true)}
          >
            الرفع الجماعي للمبارزات
          </AdminButton>
          <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
            إضافة اختبار جديد
          </AdminButton>
        </div>
      </PageHeader>


      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatsCard 
          title="إجمالي الاختبارات" 
          value={exams.length} 
          icon={FileText} 
          color="blue"
          description="مخطوطة في الخزانة"
        />
        <AdminStatsCard 
          title="إجمالي المحاولات" 
          value={exams.reduce((acc, e) => acc + e._count.results, 0)} 
          icon={Users} 
          color="purple"
          description="مبارزة تمت بنجاح"
        />
        <AdminStatsCard 
          title="مواد مختبرة" 
          value={Array.from(new Set(exams.map(e => e.subject.id))).length} 
          icon={Target} 
          color="green"
          description="فرع علمي نشط"
        />
        <AdminStatsCard 
          title="حصاد الأسبوع" 
          value={exams.filter(e => new Date(e.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} 
          icon={Calendar} 
          color="yellow"
          description="سجلات أضيفت حديثاً"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        <AdminDataTable
          columns={columns}
          data={exams}
          loading={isLoading}
          serverSide
          totalRows={pagination?.total || 0}
          pageCount={pagination?.totalPages || 1}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          pageSize={limit}
          actions={{ onRefresh: () => refetch() }}
          toolbar={
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث في سجلات الاختبارات..."
                  className="h-10 w-72 rounded-xl border border-border bg-accent/10 px-10 text-sm outline-none ring-primary transition focus:ring-1 font-bold"
                />
              </div>
            </div>
          }
        />
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {editingExam ? (
                  <>
                    <Hammer className="w-7 h-7 text-indigo-500" />
                    تنقيح مخطط الاختبار
                  </>
                ) : (
                  <>
                    <Plus className="w-7 h-7 text-emerald-500" />
                    صياغة اختبار ملكي جديد
                  </>
                )}
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
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">عنوان المبارزة</FormLabel>
                      <FormControl><Input {...field} className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-bold" /></FormControl>
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
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11 px-4 text-xs font-bold">
                              <SelectValue placeholder="اختر المادة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10">
                            {subjects.map((subject: Subject) => (
                              <SelectItem key={subject.id} value={subject.id} className="font-bold">
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
                            className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-black" 
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">تصنيف المبارزة</FormLabel>
                        <FormControl><Input {...field} placeholder="مثال: تجريبي / نهائي" className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-bold" /></FormControl>
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
                        <FormControl><Input {...field} className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-mono text-[10px]" dir="ltr" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <AdminButton type="submit" className="w-full h-14 text-md font-black rounded-2xl shadow-xl" icon={editingExam ? Hammer : Send}>
                    {editingExam ? "حفظ مخطط الاختبار" : "اعتماد الاختبار رسمياً"}
                  </AdminButton>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewExam} onOpenChange={() => setPreviewExam(null)}>
        <DialogContent className="max-w-4xl h-[80vh] bg-card/90 backdrop-blur-2xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-primary/5">
              <div>
                <h3 className="text-2xl font-black">{previewExam?.title}</h3>
                <p className="text-sm font-bold text-muted-foreground opacity-70">
                  {previewExam?.subject.nameAr || previewExam?.subject.name} - {previewExam?.year}
                </p>
              </div>
              <AdminButton variant="outline" size="lg" onClick={() => window.open(previewExam?.url, "_blank")} icon={ExternalLink} className="rounded-2xl border-white/10">
                فتح برابط ملكي
              </AdminButton>
            </div>
            <div className="flex-1 bg-white/[0.02] relative">
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
        title="إتلاف مخطط الاختبار؟"
        description="سيتم حذف المخطوطة ونتائج المبارزات بشكل نهائي من أرشيف المملكة. هل أنت متأكد؟"
        confirmText="نعم، احرق السجلات"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <BulkUploadDialog 
         open={bulkDialogOpen}
         onOpenChange={setBulkDialogOpen}
         subjects={subjects}
         onSuccess={() => refetch()}
      />
    </div>
  );
}
