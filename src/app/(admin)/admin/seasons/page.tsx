"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminDataTable, RowActions } from "@/components/admin/ui/admin-table";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminStatsCard } from "@/components/admin/ui/admin-card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import {
  Plus, Crown, Calendar,
  Flame, Swords, Sparkles,
  Zap, History, Timer, Trophy,
  Hammer,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { motion } from "framer-motion";
import { logger } from '@/lib/logger';

interface Season {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  rewards: string | null;
  createdAt: string;
  _count: {
    participations: number;
    leaderboards: number;
  };
}

const seasonSchema = z.object({
  name: z.string().min(1, "اسم الموسم مطلوب"),
  description: z.string().optional(),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().min(1, "تاريخ النهاية مطلوب"),
  isActive: z.boolean(),
  rewards: z.string().optional()
});

type SeasonFormValues = z.infer<typeof seasonSchema>;

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSeason, setEditingSeason] = React.useState<Season | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<SeasonFormValues>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      isActive: true,
      rewards: ""
    }
  });

  const fetchSeasons = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/seasons");
      const data = await response.json();
      setSeasons(data.seasons || []);
    } catch (error) {
      logger.error("Error fetching seasons:", error);
      toast.error("حدث خطأ في استدعاء سجلات الملاحم");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  const handleOpenDialog = (season?: Season) => {
    if (season) {
      setEditingSeason(season);
      form.reset({
        name: season.name,
        description: season.description || "",
        startDate: season.startDate.split("T")[0],
        endDate: season.endDate.split("T")[0],
        isActive: season.isActive,
        rewards: season.rewards || ""
      });
    } else {
      setEditingSeason(null);
      form.reset({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        isActive: true,
        rewards: ""
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: SeasonFormValues) => {
    try {
      const url = "/api/admin/seasons";
      const method = editingSeason ? "PATCH" : "POST";
      const body = editingSeason ? { ...values, id: editingSeason.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        toast.success(editingSeason ? "تم تحديث قوانين الموسم" : "تم إعلان ملحمة جديدة في الإمبراطورية");
        setDialogOpen(false);
        fetchSeasons();
      } else {
        toast.error("فشل في حفظ الموسم");
      }
    } catch (error) {
      logger.error("Error saving season:", error);
      toast.error("خطأ في الاتصال بالسجلات");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/seasons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id })
      });

      if (response.ok) {
        toast.success("تم مسح الموسم وحرق سجلاته");
        fetchSeasons();
      } else {
        toast.error("فشل في الإتلاف");
      }
    } catch (error) {
      logger.error("Error deleting season:", error);
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const columns: ColumnDef<Season>[] = [
  {
    accessorKey: "name",
    header: "الموسم / الملحمة",
    cell: ({ row }) => {
      const season = row.original;
      return (
        <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] ${season.isActive ? "bg-purple-500/10 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "bg-muted text-muted-foreground"} border border-white/10`}>
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{season.name}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60 line-clamp-1 max-w-[200px]">
                {season.description || "لا يوجد وصف لهذا العصر"}
              </p>
            </div>
          </div>);

    }
  },
  {
    accessorKey: "isActive",
    header: "الحالة الملكية",
    cell: ({ row }) => {
      const active = row.original.isActive;
      return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500/30"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-emerald-500" : "text-muted-foreground"}`}>
              {active ? "حقبة نشطة" : "حقبة منتهية"}
            </span>
          </div>);

    }
  },
  {
    id: "duration",
    header: "الفترة الزمنية",
    cell: ({ row }) =>
    <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-black">{new Date(row.original.startDate).toLocaleDateString("ar-EG")}</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-50">
            <Timer className="w-3 h-3" />
            <span className="text-[10px] font-bold">{new Date(row.original.endDate).toLocaleDateString("ar-EG")}</span>
          </div>
        </div>

  },
  {
    id: "stats",
    header: "إحصائيات المعركة",
    cell: ({ row }) =>
    <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Swords className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-black">{row.original._count?.participations || 0} محارب</span>
          </div>
          <div className="flex items-center gap-2 opacity-60">
            <Trophy className="w-3 h-3 text-yellow-500" />
            <span className="text-[10px] font-bold">{row.original._count?.leaderboards || 0} قائمة تصنيف</span>
          </div>
        </div>

  },
  {
    id: "actions",
    header: "التحكم الإمبراطوري",
    cell: ({ row }) =>
    <RowActions
      row={row.original}
      onEdit={handleOpenDialog}
      onDelete={(s) => setDeleteDialog({ open: true, id: s.id })}
      extraActions={[
      {
        icon: Zap,
        label: "تصفير الـ Leaderboard",
        onClick: () => toast.success("تم إرسال أمر لإعادة تعيين موازين القوى وبدء حقبة جديدة.")
      }]
      } />


  }];


  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="المواسم القتالية (Battle Passes) 🛡️"
        description="إدارة العصور التعليمية، ضبط جوائز الـ Battle Pass، وجدولة ملاحم القمة لجيش المحاربين.">
        
        <AdminButton
          icon={Plus}
          onClick={() => handleOpenDialog()}
          className="h-14 px-8 rounded-2xl text-md font-black shadow-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
          
          إعلان موسم جديد
        </AdminButton>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatsCard
          title="عصور المملكة"
          value={seasons.length}
          icon={History}
          color="blue"
          description="إجمالي المواسم المسجلة" />
        
        <AdminStatsCard
          title="الحقبة الحالية"
          value={seasons.filter((s) => s.isActive).length}
          icon={Flame}
          color="red"
          description="مواسم نشطة الآن" />
        
        <AdminStatsCard
          title="جيش المشاركين"
          value={seasons.reduce((acc, s) => acc + (s._count?.participations || 0), 0)}
          icon={Swords}
          color="purple"
          description="إجمالي تداخل المحاربين" />
        
        <AdminStatsCard
          title="جوائز مسلحة"
          value={seasons.filter((s) => s.rewards).length}
          icon={Trophy}
          color="yellow"
          description="مواسم بكنوز محددة" />
        
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
        
        {loading ?
        <TableSkeleton rows={6} cols={5} /> :

        <AdminDataTable
          columns={columns}
          data={seasons}
          searchKey="name"
          searchPlaceholder="ابحث في سجلات الزمن..."
          actions={{ onRefresh: () => fetchSeasons() }} />

        }
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {editingSeason ?
                <>
                    <Hammer className="w-7 h-7 text-indigo-500" />
                    تغيير معالم الحقبة
                  </> :

                <>
                    <Sparkles className="w-7 h-7 text-purple-500" />
                    إعلان عصر جديد
                  </>
                }
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                حدد ملامح الموسم القادم وأسس حجر الزاوية للمنافسة بين الأبطال.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">اسـم الموسم</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="موسم فرسان النيل..." className="rounded-xl border-white/10 bg-white/5 h-12 px-6 font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">تاريخ العصر (الوصف)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="لقد بدأ زمن جديد..." className="rounded-2xl border-white/10 bg-white/5 p-4 min-h-[80px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">فجر الموسم (بداية)</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">غروب الموسم (نهاية)</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="rounded-xl border-white/10 bg-white/5 h-11 px-4 font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  
                </div>

                <FormField
                  control={form.control}
                  name="rewards"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">مخطط الغنائم (Rewards Path)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="المستوى 1: وسام، المستوى 5: لقب..." className="rounded-2xl border-white/10 bg-white/5 p-4 min-h-[80px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) =>
                  <FormItem className="flex items-center justify-between rounded-xl border border-white/10 p-4 bg-white/5 shadow-inner">
                      <div className="space-y-0.5">
                        <FormLabel className="font-black text-xs">تفعيل الحقبة الآن؟</FormLabel>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">سيظهر الموسم فوراً لكافة المحاربين</p>
                      </div>
                      <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange} />
                      
                      </FormControl>
                    </FormItem>
                  } />
                

                <DialogFooter className="pt-4">
                  <AdminButton type="submit" icon={editingSeason ? Hammer : Sparkles} className="w-full h-14 text-md font-black shadow-xl rounded-2xl">
                    {editingSeason ? "تحديث ميثاق الموسم" : "إعلان الموسم في الإمبراطورية"}
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
        title="إتلاف الموسم نهائياً؟"
        description="أنت على وشك حرق سجلات هذا الموسم من تاريخ المملكة. هل أنت متأكد؟"
        confirmText="نعم، احذف الموسم"
        variant="destructive"
        onConfirm={handleDelete} />
      
    </div>);

}
