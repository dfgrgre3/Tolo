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
  Plus, Gift, Users, Download, Upload, 
  Sparkles, Gem, Shield, Crown, Wand2, Hammer, Box, Send
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { TableSkeleton } from "@/components/admin/ui/loading-skeleton";
import { m } from "framer-motion";

import { logger } from '@/lib/logger';

interface Reward {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  imageUrl: string | null;
  metadata: string | null;
  isTradeable: boolean;
  isActive: boolean;
  createdAt: string;
  _count: {
    userRewards: number;
  };
}

const rewardSchema = z.object({
  name: z.string().min(1, "اسم الغنيمة مطلوب"),
  description: z.string().min(1, "وصف الكنز مطلوب"),
  type: z.string().min(1, "النوع مطلوب"),
  rarity: z.string().min(1, "الندرة مطلوبة"),
  imageUrl: z.string().url("الرابط غير صالح").optional().or(z.literal("")),
  isTradeable: z.boolean(),
  isActive: z.boolean(),
});

type RewardFormValues = z.infer<typeof rewardSchema>;

const rewardTypes = [
  { value: "badge", label: "وسام شرف", icon: Shield },
  { value: "title", label: "لقب ملكي", icon: Crown },
  { value: "avatar_frame", label: "هالة الصورة", icon: Sparkles },
  { value: "effect", label: "تميمة سحرية", icon: Wand2 },
  { value: "item", label: "عنصر مقدس", icon: Box },
];

const rarityColors: Record<string, { color: "green" | "blue" | "yellow" | "red" | "purple" | "default", label: string }> = {
  common: { color: "default", label: "عادي" },
  uncommon: { color: "green", label: "غير عادي" },
  rare: { color: "blue", label: "نادر" },
  epic: { color: "purple", label: "ملحمي" },
  legendary: { color: "yellow", label: "أسطوري" },
};

export default function AdminRewardsPage() {
  const [rewards, setRewards] = React.useState<Reward[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingReward, setEditingReward] = React.useState<Reward | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  const form = useForm<RewardFormValues>({
    resolver: zodResolver(rewardSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "badge",
      rarity: "common",
      imageUrl: "",
      isTradeable: false,
      isActive: true,
    },
  });

  const fetchRewards = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/rewards");
      const data = await response.json();
      setRewards(data.rewards || []);
    } catch (_error) {
      logger.error("Error fetching rewards:", _error);
      toast.error("حدث خطأ في فتح الخزينة");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const handleOpenDialog = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward);
      form.reset({
        name: reward.name,
        description: reward.description,
        type: reward.type,
        rarity: reward.rarity,
        imageUrl: reward.imageUrl || "",
        isTradeable: reward.isTradeable,
        isActive: reward.isActive,
      });
    } else {
      setEditingReward(null);
      form.reset({
        name: "",
        description: "",
        type: "badge",
        rarity: "common",
        imageUrl: "",
        isTradeable: false,
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (values: RewardFormValues) => {
    try {
      const url = "/api/admin/rewards";
      const method = editingReward ? "PATCH" : "POST";
      const body = editingReward ? { ...values, id: editingReward.id } : values;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingReward ? "تم تحديث ميزات الكنز" : "تم سك جائزة جديدة في الخزانة");
        setDialogOpen(false);
        fetchRewards();
      } else {
        toast.error("فشل في حفظ الغنيمة");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال بالخزانة");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch("/api/admin/rewards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });

      if (response.ok) {
        toast.success("تم إتلاف الجائزة بنجاح");
        fetchRewards();
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
    const exportData = rewards.map((reward) => ({
      name: reward.name,
      description: reward.description,
      type: reward.type,
      rarity: reward.rarity,
      imageUrl: reward.imageUrl,
      isTradeable: reward.isTradeable,
      isActive: reward.isActive,
    }));
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `royal-treasures-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("تم تصدير سجلات الخزينة");
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
        for (const reward of imported) {
          try {
            const response = await fetch("/api/admin/rewards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(reward),
            });
            if (response.ok) importedCount++;
          } catch {
            // Skip
          }
        }
        
        toast.success(`تم إضافة ${importedCount} غنيمة جديدة للخزينة`);
        fetchRewards();
      } catch {
        toast.error("فشل في قراءة سجلات الاستيراد");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const columns: ColumnDef<Reward>[] = [
    {
      accessorKey: "name",
      header: "الغنيمة الملكية",
      cell: ({ row }) => {
        const reward = row.original;
        const typeInfo = rewardTypes.find(t => t.value === reward.type);
        const Icon = typeInfo?.icon || Gift;
        return (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-transform hover:scale-105">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">{reward.name}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60 truncate max-w-[200px] italic mt-0.5">
                {reward.description}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "نوع الكنز",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        const typeInfo = rewardTypes.find(t => t.value === type);
        return (
          <Badge variant="outline" className="rounded-lg bg-white/5 text-primary border-primary/20 font-black text-[10px] uppercase px-3 py-1">
            {typeInfo?.label || type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "rarity",
      header: "رتبة الندرة",
      cell: ({ row }) => {
        const rarity = row.getValue("rarity") as string;
        const config = rarityColors[rarity] || rarityColors.common;
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
      accessorKey: "isTradeable",
      header: "المقايضة",
      cell: ({ row }) => {
        const tradeable = row.getValue("isTradeable") as boolean;
        return (
          <div className="flex items-center gap-2">
             <div className={`w-1.5 h-1.5 rounded-full ${tradeable ? "bg-blue-500" : "bg-gray-500/30"}`} />
             <span className={`text-[10px] font-black uppercase tracking-widest ${tradeable ? "text-blue-500" : "text-muted-foreground"}`}>
               {tradeable ? "قابل للمقايضة" : "حق شخصي"}
             </span>
          </div>
        );
      },
    },
    {
      id: "owners",
      header: "جيش المالكين",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-black">{row.original._count?.userRewards || 0} محارب</span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "حالة السك",
      cell: ({ row }) => {
        const active = row.original.isActive;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500/30"}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-emerald-500" : "text-muted-foreground"}`}>
              {active ? "متاح للغنائم" : "تم إيقاف الإنتاج"}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "التحكم الملكي",
      cell: ({ row }) => (
        <RowActions
          row={row.original}
          onEdit={handleOpenDialog}
          onDelete={(r) => setDeleteDialog({ open: true, id: r.id })}
        />
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="خزينة الغنائم الملكية 🎁"
        description="إدارة كنوز المملكة، الأوسمة النادرة، والجوائز المخصصة لمبدعي الإمبراطورية."
      >
        <div className="flex items-center gap-3">
          <AdminButton variant="outline" icon={Download} onClick={handleExport}>
            تصدير سجل الخزانة
          </AdminButton>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <AdminButton variant="outline" icon={Upload}>
              استيراد كنوز
            </AdminButton>
          </div>
          <AdminButton icon={Plus} onClick={() => handleOpenDialog()}>
            سك جائزة جديدة
          </AdminButton>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatsCard 
          title="إجمالي الغنائم" 
          value={rewards.length} 
          icon={Gem} 
          color="yellow"
          description="كنوز في الخزائن"
        />
        <AdminStatsCard 
          title="كنوز أسطورية" 
          value={rewards.filter(r => r.rarity === "legendary").length} 
          icon={Crown} 
          color="yellow"
          description="رتبة أسطورية عليا"
        />
        <AdminStatsCard 
          title="إجمالي المالكين" 
          value={rewards.reduce((acc, r) => acc + (r._count?.userRewards || 0), 0)} 
          icon={Users} 
          color="blue"
          description="محارب يتقلدون الغنائم"
        />
        <AdminStatsCard 
          title="غنائم نشطة" 
          value={rewards.filter(r => r.isActive).length} 
          icon={Sparkles} 
          color="green"
          description="متاحة حالياً للاكتساب"
        />
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rpg-glass-light dark:rpg-glass p-1 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
      >
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <AdminDataTable
            columns={columns}
            data={rewards}
            searchKey="name"
            searchPlaceholder="ابحث في سجلات الغنائم..."
            actions={{ onRefresh: () => fetchRewards() }}
          />
        )}
      </m.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card/80 backdrop-blur-xl border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500" />
          <div className="p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {editingReward ? (
                  <>
                    <Hammer className="w-7 h-7 text-indigo-500" />
                    تنقيح ميثاق الجائزة
                  </>
                ) : (
                  <>
                    <Sparkles className="w-7 h-7 text-amber-500" />
                    سك جائزة ملكية جديدة
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="font-bold text-muted-foreground">
                حدد مواصفات الجائزة لتكون لائقة بمن يحصل عليها من الأبطال.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">اسـم الغنيمة</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="وسام الفارس الذهبي..." className="rounded-xl border-white/10 bg-white/5 h-12 px-6 font-bold" />
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
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">وصف السحر/التأثير</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="جائزة تمنح لمن..." className="rounded-2xl border-white/10 bg-white/5 p-4 min-h-[80px] font-medium" />
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">صنف الكنز</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11 text-xs">
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10">
                            {rewardTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value} className="font-bold cursor-pointer">
                                <div className="flex items-center gap-2">
                                   <type.icon className="w-3.5 h-3.5" />
                                   <span>{type.label}</span>
                                </div>
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
                    name="rarity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">رتبة الندرة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-11 text-xs">
                              <SelectValue placeholder="اختر الندرة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10">
                            {Object.entries(rarityColors).map(([value, config]) => (
                              <SelectItem key={value} value={value} className="font-bold cursor-pointer">
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">رابط الأيقونة المقدسة</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" dir="ltr" className="rounded-xl border-white/10 bg-white/5 h-11 px-4 text-xs font-mono font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isTradeable"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-white/10 p-4 bg-white/5">
                        <div className="space-y-0.5">
                          <FormLabel className="font-black text-xs">قابل للمقايضة؟</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-white/10 p-4 bg-white/5">
                        <div className="space-y-0.5">
                          <FormLabel className="font-black text-xs">نشط للتوزيع؟</FormLabel>
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
                </div>
                <DialogFooter className="pt-4">
                  <AdminButton type="submit" icon={editingReward ? Hammer : Send} className="w-full h-14 text-md font-black shadow-xl rounded-2xl">
                    {editingReward ? "تحديث ميثاق الجائزة" : "سك الجائزة في السجلات"}
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
        title="إتلاف الغنيمة نهائياً؟"
        description="أنت على وشك حرق سجلات هذه الجائزة من الخزينة. هل أنت متأكد؟"
        confirmText="نعم، أتلف الكنز"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
