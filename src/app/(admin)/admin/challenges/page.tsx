"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard, AdminStatsCard } from "@/components/admin/ui/admin-card";
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
  Plus, Trophy, Download, Upload, Target, 
  Zap, Users, Flame, Swords, Hammer, Sparkles, Send
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { motion } from "framer-motion";

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
  title: z.string().min(1, "عنوان التحدي مطلوب"),
  description: z.string().min(1, "وصف التحدي مطلوب"),
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
  { value: "daily", label: "مبارزة يومية" },
  { value: "weekly", label: "حملة أسبوعية" },
  { value: "monthly", label: "ملحمة شهرية" },
  { value: "special", label: "بطولة خاصة" },
];

const difficultyOptions = [
  { value: "EASY", label: "تدريب مبتدئ" },
  { value: "MEDIUM", label: "مستوى جندي" },
  { value: "HARD", label: "رتبة فارس" },
  { value: "EXPERT", label: "مستوى أسطوري" },
];

const difficultyColors: Record<string, { color: "green" | "blue" | "yellow" | "red" | "purple" | "default", label: string }> = {
  EASY: { color: "green", label: "تدريب مبتدئ" },
  MEDIUM: { color: "blue", label: "مستوى جندي" },
  HARD: { color: "yellow", label: "رتبة فارس" },
  EXPERT: { color: "red", label: "مستوى أسطوري" },
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
        fetch("/api/admin/challenges"),
        fetch("/api/admin/subjects?limit=100"),
      ]);
      const challengesData = await challengesRes.json();
      const subjectsData = await subjectsRes.json();
      setChallenges(challengesData.challenges || []);
      setSubjects(subjectsData.subjects || []);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("حدث خطأ في استدعاء سجلات المبارزات");
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
      const url = "/api/admin/challenges";
      const method = editingChallenge ? "PATCH" : "POST";
      const body = editingChallenge ? { ...values, id: editingChallenge.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingChallenge ? "تم تحديث خطة المبارزة" : "تم نقش مبارزة جديدة في ساحة القتال");
        setDialogOpen(false);
        fetchChallenges();
      } else {
        toast.error("فشل في تثبيت المبارزة");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال بالخادم");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/challenges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم مسح المبارزة من السجلات");
        fetchChallenges();
      } else {
        toast.error("فشل في الإتلاف");
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
    const exportFileDefaultName = `challenges-empire-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("تم تصدير سجلات المبارزات بنجاح");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (!Array.isArray(imported)) {
          throw new Error("تنسيق المخطوطة غير صالح");
        }
        
        let importedCount = 0;
        for (const challenge of imported) {
          try {
            const response = await fetch("/api/admin/challenges", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(challenge),
            });
            if (response.ok) importedCount++;
          } catch {
            // Skip
          }
        }
        
        toast.success(`تم استدعاء ${importedCount} مبارزة جديدة للمملكة`);
        fetchChallenges();
      } catch {
        toast.error("فشل في قراءة المخطوطات المستوردة");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const columns: ColumnDef<Challenge>[] = [
    {
      accessorKey: "title",
      header: "المبارزة / التحدي",
      cell: ({ row }) => {
        const challenge = row.original;
        return (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-transform hover:scale-105">
              <Swords className="h-6 w-6" />
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
      header: "مستوى الصعوبة",
      cell: ({ row }) => {
        const diff = row.original.difficulty;
        const config = difficultyColors[diff] || difficultyColors.MEDIUM;
        return (
          <Badge 
            variant="outline" 
            className="font-black text-[10px] uppercase tracking-widest rounded-lg border-2 px-3 py-1 bg-white/5"
            style={{ color: `oklch(var(--${config.color}))`, borderColor: `oklch(var(--${config.color}) / 0.3)` }}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "xpReward",
      header: "مكافأة النصر",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          <span className="text-sm font-black">{row.original.xpReward} XP</span>
        </div>
      ),
    },
    {
      id: "completions",
      header: "جيش المشاركين",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-black">{row.original._count?.completions || 0} محارب اجتازها</span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "الحالة الآن",
      cell: ({ row }) => {
        const active = row.original.isActive;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500/30"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-emerald-500" : "text-muted-foreground"}`}>
              {active ? "متاحة للقتال" : "خارج الخدمة"}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "التحكم الإمبراطوري",
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
        title=" ساحة التحديات والمبارزات ⚔️"
        description="إدارة المهمات اليومية، البطولات الملحمية، وتوزيع هالات الـ XP للمحاربين المميزين."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={Download} onClick={handleExport}>
            تصدير المخطوطات
          </AdminButton>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <AdminButton variant="outline" icon={Upload}>
              استيراد سجلات
            </AdminButton>
          </div>
          <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
            إعلان مبارزة جديدة
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatsCard 
          title="إجمالي التحديات" 
          value={challenges.length} 
          icon={Trophy} 
          color="yellow"
          description="مهمة في ساحات المعارك"
        />
        <AdminStatsCard 
          title="تحديات نشطة" 
          value={challenges.filter(c => c.isActive).length} 
          icon={Flame} 
          color="red"
          description="تنتظر المحاربين الآن"
        />
        <AdminStatsCard 
          title="إجمالي الانتصارات" 
          value={challenges.reduce((acc, c) => acc + (c._count?.completions || 0), 0)} 
          icon={Target} 
          color="green"
          description="عملية اجتياز ناجحة"
        />
        <AdminStatsCard 
          title="متوسط الـ XP" 
          value={Math.round(challenges.reduce((acc, c) => acc + c.xpReward, 0) / (challenges.length || 1))} 
          icon={Zap} 
          color="blue"
          description="هالة المكافأة لكل مهمة"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <AdminDataTable
            columns={columns}
            data={challenges}
            searchKey="title"
            searchPlaceholder="ابحث في سجلات المبارزات..."
            actions={{ onRefresh: () => fetchChallenges() }}
          />
        )}
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 via-red-500 to-purple-500" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {editingChallenge ? (
                  <>
                    <Hammer className="w-7 h-7 text-indigo-500" />
                    تنقيح ميثاق المبارزة
                  </>
                ) : (
                  <>
                    <Sparkles className="w-7 h-7 text-orange-500" />
                    بناء تحدي ملحمي جديد
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                أدخل بيانات المبارزة بدقة لضمان عدالة القتال بين المحاربين.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">اسـم المبارزة</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="تحدي فرسان القمة..." className="rounded-xl border-white/10 bg-white/5 h-12 px-6 font-bold" />
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
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">تفاصيل المهمة</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="يجب على المحارب..." className="rounded-2xl border-white/10 bg-white/5 p-4 min-h-[100px] font-medium" />
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">دورة القتال</FormLabel>
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">درجة الخطورة</FormLabel>
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">الفئة العسكرية</FormLabel>
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">هالة المكافأة (XP)</FormLabel>
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
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">العلم التابع له (اختياري)</FormLabel>
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">بداية الحملة</FormLabel>
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">نهاية الحملة</FormLabel>
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
                        <FormLabel className="font-black text-xs">تفعيل النزاع المسلح؟</FormLabel>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">المبارزات النشطة تظهر فوراً للجيش</p>
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
                  <AdminButton type="submit" icon={editingChallenge ? Hammer : Send} className="w-full h-14 text-md font-black shadow-xl rounded-2xl">
                    {editingChallenge ? "تحديث ميثاق المبارزة" : "نشر المبارزة في الإمبراطورية"}
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
        title="إلغاء المبارزة وحرق السجل؟"
        description="أنت على وشك مسح هذه المبارزة من تاريخ المملكة. هل أنت متأكد؟"
        confirmText="نعم، احذف المبارزة"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
