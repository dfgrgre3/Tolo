"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard, AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Plus, LayoutGrid, RefreshCw, Search, Book, GraduationCap, Users, Clock, Send, Hammer } from "lucide-react";
import { AdminUpload } from "@/components/admin/ui/admin-upload";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { 
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
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
  SelectValue 
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

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
  level: string;
  price: number;
  requirements: string | null;
  instructorName: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  _count: {
    enrollments: number;
    topics: number;
  };
}

interface SubjectsResponse {
  data: {
    subjects: Subject[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const subjectSchema = z.object({
  name: z.string().min(1, "English Name is required"),
  nameAr: z.string().min(1, "الاسم العربي مطلوب"),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  isActive: z.boolean(),
  level: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]),
  price: z.coerce.number().min(0),
  requirements: z.string().optional().nullable(),
  instructorName: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export default function AdminSubjectsPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "subjects", page, limit, deferredSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (deferredSearch) {
        params.set("search", deferredSearch);
      }

      const response = await fetch(`/api/admin/subjects?${params.toString()}`);
      return (await response.json()) as SubjectsResponse;
    },
  });

  const subjects = data?.data?.subjects || [];
  const pagination = data?.data?.pagination;

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      code: "",
      description: "",
      icon: "📚",
      color: "#6366f1",
      type: "COURSE",
      isActive: true,
      level: "MEDIUM",
      price: 0,
      requirements: "",
      instructorName: "",
      thumbnailUrl: "",
      trailerUrl: "",
    },
  });

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      form.reset({
        name: subject.name,
        nameAr: subject.nameAr || "",
        code: subject.code || "",
        description: subject.description || "",
        icon: subject.icon || "📚",
        color: subject.color || "#6366f1",
        type: subject.type || "COURSE",
        isActive: subject.isActive,
        level: (subject.level as any) || "MEDIUM",
        price: subject.price || 0,
        requirements: subject.requirements || "",
        instructorName: subject.instructorName || "",
        thumbnailUrl: subject.thumbnailUrl || "",
        trailerUrl: subject.trailerUrl || "",
      });
    } else {
      setEditingSubject(null);
      form.reset({
        name: "",
        nameAr: "",
        code: "",
        description: "",
        icon: "📚",
        color: "#6366f1",
        type: "COURSE",
        isActive: true,
        level: "MEDIUM",
        price: 0,
        requirements: "",
        instructorName: "",
        thumbnailUrl: "",
        trailerUrl: "",
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (values: SubjectFormValues) => {
    try {
      const method = editingSubject ? "PATCH" : "POST";
      const body = editingSubject ? { ...values, id: editingSubject.id } : values;
      const response = await fetch("/api/admin/subjects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingSubject ? "تم تحديث المخطوطة بنجاح" : "تمت إضافة مادة جديدة للمملكة");
        setDialogOpen(false);
        refetch();
      } else {
        toast.error("فشل في حفظ البيانات");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال");
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
        toast.success("تم إتلاف المادة من السجلات");
        refetch();
      } else {
        toast.error("فشل الحذف");
      }
    } catch (_error) {
      toast.error("خطأ في الخادم");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Subject>[] = [
    {
      accessorKey: "nameAr",
      header: "المادة الدراسية",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-4">
             <div 
              className="h-12 w-12 flex items-center justify-center rounded-[1rem] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-transform hover:scale-110"
              style={{ color: s.color || "#6366f1" }}
            >
              <span className="text-xl">{s.icon || "📚"}</span>
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{s.nameAr || s.name}</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest italic">
                {s.code || "ARCHIVE-ID"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: "تكلفة التعلم",
      cell: ({ row }) => (
        <span className="font-black text-emerald-500 text-xs tracking-tighter shadow-emerald-500/20 drop-shadow-sm">
          {formatNumber(row.original.price)} EGP
        </span>
      ),
    },
    {
      accessorKey: "level",
      header: "رتبة الصعوبة",
      cell: ({ row }) => {
        const levels: Record<string, { label: string, color: string }> = { 
          EASY: { label: "مبتدئ", color: "emerald" }, 
          MEDIUM: { label: "متوسط", color: "blue" }, 
          HARD: { label: "متقدم", color: "amber" }, 
          EXPERT: { label: "خبير", color: "red" } 
        };
        const config = levels[row.original.level] || levels.MEDIUM;
        return (
          <Badge 
            variant="outline" 
            className={`font-black text-[10px] uppercase tracking-widest bg-white/5 border-${config.color}-500/30 text-${config.color}-500 px-3 py-1 rounded-lg`}
          >
            {config.label}
          </Badge>
        );
      }
    },
    {
      accessorKey: "stats",
      header: "سجلات الانتساب",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black flex items-center gap-1">
             <Users className="w-3 h-3 text-muted-foreground" />
             {formatNumber(row.original._count?.enrollments || 0)} طالب
          </span>
          <span className="text-[10px] font-bold text-muted-foreground italic flex items-center gap-1">
             <Book className="w-2.5 h-2.5" />
             {formatNumber(row.original._count?.topics || 0)} موضوع
          </span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "حالة الورشة",
      cell: ({ row }) => {
        const active = row.original.isActive;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500/30"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-emerald-500" : "text-muted-foreground"}`}>
              {active ? "نشط" : "مسودة معلقة"}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "التحكم الإداري",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(s) => setDeleteDialog({ open: true, id: s.id })}
          extraActions={[
            { icon: LayoutGrid, label: "صفحة المنهج", onClick: (s) => router.push(`/admin/subjects/${s.id}/curriculum`) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader 
        title="أكاديمية الدورات الملكية 🎓" 
        description="تطوير وإدارة المناهج الدراسية، المواد العلمية، وخطط التعلم الاستراتيجية."
      >
        <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
          سِك مادة جديدة
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatsCard 
          title="إجمالي المواد" 
          value={subjects.length || 0} 
          icon={Book} 
          color="blue"
          description="مخطوطة تعليمية"
        />
        <AdminStatsCard 
          title="إجمالي الطلاب" 
          value={subjects.reduce((acc, s) => acc + (s._count?.enrollments || 0), 0)} 
          icon={Users} 
          color="purple"
          description="متعلم مسجل حالياً"
        />
        <AdminStatsCard 
          title="متوسط الأسعار" 
          value={subjects.length ? Math.round(subjects.reduce((acc, s) => acc + s.price, 0) / subjects.length) : 0} 
          icon={GraduationCap} 
          color="green"
          description="EGP للدورة الواحدة"
        />
        <AdminStatsCard 
          title="نشاط الأكاديمية" 
          value={subjects.filter(s => s.isActive).length} 
          icon={Clock} 
          color="yellow"
          description="دورة متاحة للعموم"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        <AdminDataTable
          columns={columns}
          data={subjects}
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
                  placeholder="ابحث في سجلات المواد..."
                  className="h-10 w-64 rounded-xl border border-border bg-accent/10 px-10 text-sm outline-none ring-primary transition focus:ring-1 font-bold"
                />
              </div>
            </div>
          }
        />
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] overflow-hidden bg-card/80 backdrop-blur-xl border-white/10 p-0 shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {editingSubject ? (
                  <>
                    <Hammer className="w-7 h-7 text-indigo-500" />
                    تنقيح بيانات المادة
                  </>
                ) : (
                  <>
                    <Plus className="w-7 h-7 text-emerald-500" />
                    تأسيس مادة تعليمية جديدة
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                املأ سجلات المادة لتكون جاهزة لطلاب الأكاديمية.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="nameAr" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">الاسم الملكي بالعربي</FormLabel>
                      <FormControl><Input {...field} value={field.value || ""} className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">English System ID</FormLabel>
                      <FormControl><Input {...field} value={field.value || ""} dir="ltr" className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-mono font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">تكلفة الاشتراك (EGP)</FormLabel>
                      <FormControl><Input type="number" {...field} className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-black" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="level" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">رتبة الصعوبة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11 px-4 text-xs font-bold">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-white/10">
                          <SelectItem value="EASY">مبتدئ</SelectItem>
                          <SelectItem value="MEDIUM">متوسط</SelectItem>
                          <SelectItem value="HARD">متقدم</SelectItem>
                          <SelectItem value="EXPERT">خبير</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="instructorName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">كبير المعلمين</FormLabel>
                      <FormControl><Input {...field} value={field.value || ""} className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">أيقونة/غلاف المادة</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input {...field} value={field.value || ""} placeholder="رابط مباشر..." dir="ltr" className="rounded-xl border-white/10 bg-white/5 h-10 px-4 text-[10px] font-mono" />
                          <AdminUpload 
                            accept="image/*" 
                            onUploadComplete={(url) => field.onChange(url)} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="trailerUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">عرض تشويقي (Trailer)</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input {...field} value={field.value || ""} placeholder="رابط يوتيوب..." dir="ltr" className="rounded-xl border-white/10 bg-white/5 h-10 px-4 text-[10px] font-mono" />
                          <AdminUpload 
                            accept="video/*" 
                            onUploadComplete={(url) => field.onChange(url)} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">وصف المنهج التعليمي</FormLabel>
                    <FormControl><Textarea {...field} value={field.value || ""} className="rounded-2xl border-white/10 bg-white/5 p-4 min-h-[100px] font-medium" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                  <p className="font-black text-xs uppercase tracking-widest text-primary">إتاحة المادة للمتعلمين</p>
                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  )} />
                </div>

                <DialogFooter className="pt-2">
                  <AdminButton type="submit" className="w-full h-14 text-md font-black rounded-2xl shadow-xl" icon={editingSubject ? Hammer : Send}>
                    {editingSubject ? "تحديث ميثاق المادة" : "تأسيس المادة في السجلات"}
                  </AdminButton>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        onConfirm={handleDelete}
        title="هل أنت متأكد من الإتلاف؟"
        description="سيتم حذف المادة الملكية وجميع سجلاتها نهائياً من أرشيف الأكاديمية."
        confirmText="نعم، أتلف السجلات"
        variant="destructive"
      />
    </div>
  );
}
