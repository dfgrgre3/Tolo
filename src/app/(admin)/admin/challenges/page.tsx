"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Target, Download, Upload, 
  Zap, Users, ClipboardList, Edit, Sparkles, Send, Trash2, Calendar
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { m } from "framer-motion";

import { apiRoutes } from "@/lib/api/routes";
import { adminFetch } from "@/lib/api/admin-api";
import { logger } from '@/lib/logger';

interface Subject {
  id: string;
  name: string;
  nameAr: string | null;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  xpReward: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  difficulty: string;
  createdAt: string;
  subject: {
    id: string;
    name: string;
    nameAr: string | null;
  } | null;
  _count: {
    completions: number;
  };
}

const challengeSchema = z.object({
  title: z.string().min(1, "عنوان المهمة مطلوب"),
  description: z.string().min(1, "وصف المهمة مطلوب"),
  type: z.string().min(1, "النوع مطلوب"),
  category: z.string().min(1, "الفئة مطلوبة"),
  xpReward: z.number().min(0, "المكافأة يجب أن تكون صفر أو أكثر"),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().min(1, "تاريخ النهاية مطلوب"),
  difficulty: z.string().min(1, "مستوى الصعوبة مطلوب"),
  subjectId: z.string().optional(),
  isActive: z.boolean(),
});

type ChallengeFormValues = z.infer<typeof challengeSchema>;

const challengeTypes = [
  { value: "daily", label: "مهمة يومية" },
  { value: "weekly", label: "مهمة أسبوعية" },
  { value: "monthly", label: "مهمة شهرية" },
  { value: "special", label: "نشاط خاص" },
];

const difficultyOptions = [
  { value: "EASY", label: "أساسي" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HARD", label: "متقدم" },
  { value: "EXPERT", label: "خبير" },
];

const difficultyColors: Record<string, { color: string, label: string }> = {
  EASY: { color: "slate", label: "أساسي" },
  MEDIUM: { color: "blue", label: "متوسط" },
  HARD: { color: "amber", label: "متقدم" },
  EXPERT: { color: "rose", label: "خبير" },
};

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingChallenge, setEditingChallenge] = React.useState<Challenge | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "daily",
      category: "",
      xpReward: 10,
      startDate: "",
      endDate: "",
      difficulty: "EASY",
      subjectId: "",
      isActive: true,
    },
  });

  const fetchChallenges = React.useCallback(async () => {
    setLoading(true);
    try {
      const [challengesRes, subjectsRes] = await Promise.all([
        adminFetch(apiRoutes.admin.challenges),
        adminFetch(`${apiRoutes.admin.subjects}?limit=100`),
      ]);
      const challengesData = await challengesRes.json();
      const subjectsData = await subjectsRes.json();
      setChallenges(challengesData.data?.challenges || challengesData.data?.items || challengesData.challenges || []);
      setSubjects(subjectsData.data?.subjects || subjectsData.data?.items || subjectsData.subjects || []);
    } catch (error) {
      logger.error("Error fetching tasks:", error);
      toast.error("حدث خطأ في استدعاء سجلات المهام");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleOpenDialog = (challenge?: Challenge) => {
    if (challenge) {
      setEditingChallenge(challenge);
      form.reset({
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        category: challenge.category,
        xpReward: challenge.xpReward,
        startDate: challenge.startDate.split("T")[0],
        endDate: challenge.endDate.split("T")[0],
        difficulty: challenge.difficulty,
        subjectId: challenge.subject?.id || "",
        isActive: challenge.isActive,
      });
    } else {
      setEditingChallenge(null);
      form.reset({
        title: "",
        description: "",
        type: "daily",
        category: "",
        xpReward: 10,
        startDate: "",
        endDate: "",
        difficulty: "EASY",
        subjectId: "",
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: ChallengeFormValues) => {
    try {
      const url = editingChallenge ? `${apiRoutes.admin.challenges}/${editingChallenge.id}` : apiRoutes.admin.challenges;
      const method = editingChallenge ? "PATCH" : "POST";
      const body = editingChallenge ? { ...values, id: editingChallenge.id } : values;

      const response = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingChallenge ? "تم تحديث المهمة بنجاح" : "تم إضافة مهمة تعليمية جديدة بنجاح");
        setDialogOpen(false);
        fetchChallenges();
      } else {
        toast.error("فشل في حفظ المهمة");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال بالخادم");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await adminFetch(apiRoutes.admin.challenges, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم حذف المهمة من السجلات");
        fetchChallenges();
      } else {
        toast.error("فشل في حذف المهمة");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleExport = () => {
    const exportData = challenges.map((challenge) => ({
      title: challenge.title,
      description: challenge.description,
      type: challenge.type,
      category: challenge.category,
      xpReward: challenge.xpReward,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      difficulty: challenge.difficulty,
      isActive: challenge.isActive,
      subjectId: challenge.subject?.id || null,
    }));
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `educational-tasks-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("تم تصدير سجلات المهام بنجاح");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (!Array.isArray(imported)) {
          throw new Error("تنسيق البيانات غير صالح");
        }
        
        let importedCount = 0;
        for (const challenge of imported) {
          try {
            const response = await adminFetch(apiRoutes.admin.challenges, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(challenge),
            });
            if (response.ok) importedCount++;
          } catch {
            // Skip
          }
        }
        
        toast.success(`تم استيراد ${importedCount} مهمة تعليمية جديدة بنجاح`);
        fetchChallenges();
      } catch {
        toast.error("فشل في قراءة البيانات المستوردة");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const columns: ColumnDef<Challenge>[] = [
    {
      accessorKey: "title",
      header: "المهمة التعليمية",
      cell: ({ row }) => {
        const challenge = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 text-primary border border-primary/20 shadow-sm transition-transform hover:scale-105">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{challenge.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[8px] font-bold py-0 border-white/5 bg-white/5 uppercase tracking-tighter opacity-70 italic">{challenge.type}</Badge>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{challenge.category}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "difficulty",
      header: "المستوى",
      cell: ({ row }) => {
        const diff = row.original.difficulty;
        const config = difficultyColors[diff] || difficultyColors.MEDIUM;
        return (
          <Badge 
            variant="outline" 
            className={`font-black text-[10px] uppercase tracking-widest rounded-lg border-2 px-3 py-1 bg-${config.color}-500/10 text-${config.color}-500 border-${config.color}-500/20`}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "xpReward",
      header: "نقاط التفاعل",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          <span className="text-sm font-black">{row.original.xpReward} نقطة</span>
        </div>
      ),
    },
    {
      id: "completions",
      header: "المشاركون",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-black">{row.original._count?.completions || 0} طالب أنجزه</span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "الحالة",
      cell: ({ row }) => {
        const active = row.original.isActive;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500/30"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-emerald-500" : "text-muted-foreground"}`}>
              {active ? "نشط" : "غير نشط"}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(c) => setDeleteDialog({ open: true, id: c.id })}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="إدارة المهام والأنشطة التعليمية"
        description="إدارة المهام اليومية، الأنشطة المنهجية، وتوزيع نقاط التفاعل للطلاب المتميزين."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={Download} onClick={handleExport}>
            تصدير البيانات
          </AdminButton>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <AdminButton variant="outline" icon={Upload}>
              استيراد البيانات
            </AdminButton>
          </div>
          <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
            إضافة مهمة جديدة
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatsCard 
          title="إجمالي المهام" 
          value={challenges.length} 
          icon={ClipboardList} 
          color="blue"
          description="مهمة في سجلات المنصة"
        />
        <AdminStatsCard 
          title="مهام نشطة" 
          value={challenges.filter(c => c.isActive).length} 
          icon={Target} 
          color="green"
          description="تنتظر الطلاب الآن"
        />
        <AdminStatsCard 
          title="إجمالي المنجزات" 
          value={challenges.reduce((acc, c) => acc + (c._count?.completions || 0), 0)} 
          icon={Users} 
          color="purple"
          description="عملية إنجاز ناجحة"
        />
        <AdminStatsCard 
          title="متوسط المكافأة" 
          value={Math.round(challenges.reduce((acc, c) => acc + c.xpReward, 0) / (challenges.length || 1))} 
          icon={Zap} 
          color="yellow"
          description="نقطة تفاعل لكل مهمة"
        />
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <AdminDataTable
            columns={columns}
            data={challenges}
            searchKey="title"
            searchPlaceholder="ابحث في سجلات المهام..."
            actions={{ onRefresh: () => fetchChallenges() }}
          />
        )}
      </m.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-primary/80 via-primary to-primary/40" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {editingChallenge ? (
                  <>
                    <Edit className="w-7 h-7 text-primary" />
                    تعديل تفاصيل المهمة
                  </>
                ) : (
                  <>
                    <Plus className="w-7 h-7 text-primary" />
                    إضافة مهمة تعليمية جديدة
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                أدخل بيانات المهمة بدقة لضمان تحسين تجربة الطلاب التعليمية.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">اسـم المهمة</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="نشاط تعليمي لـ..." className="rounded-xl border-white/10 bg-white/5 h-12 px-6 font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">وصف المهمة</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="يجب على الطالب القيام بـ..." className="rounded-2xl border-white/10 bg-white/5 p-4 min-h-[100px] font-medium" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">دورة المهمة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11">
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10">
                            {challengeTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value} className="font-bold cursor-pointer">
                                {type.label}
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
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مستوى الصعوبة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11">
                              <SelectValue placeholder="اختر الصعوبة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10">
                            {difficultyOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="font-bold cursor-pointer">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">الفئة</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="مثال: MATH" className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="xpReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">نقاط التفاعل</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="rounded-xl border-white/10 bg-white/5 h-11 text-center font-black"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">المادة التابع لها (اختياري)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11">
                            <SelectValue placeholder="اختر المادة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-white/10">
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id} className="font-bold cursor-pointer">
                              {subject.nameAr || subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">تاريخ البداية</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="rounded-xl border-white/10 bg-white/5 h-11 font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">تاريخ النهاية</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="rounded-xl border-white/10 bg-white/5 h-11 font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-xl border border-white/10 p-4 bg-white/5">
                      <div className="space-y-0.5">
                        <FormLabel className="font-black text-xs">تفعيل المهمة؟</FormLabel>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">المهام النشطة تظهر فوراً للطلاب</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <AdminButton type="submit" icon={editingChallenge ? Edit : Send} className="w-full h-14 text-md font-black shadow-xl rounded-2xl">
                    {editingChallenge ? "تحديث المهمة" : "نشر المهمة للمنصة"}
                  </AdminButton>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <AdminConfirm
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        title="حذف المهمة نهائياً؟"
        description="هل أنت متأكد من حذف هذه المهمة من السجلات؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="تأكيد الحذف"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

