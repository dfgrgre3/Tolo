"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton, IconButton } from "@/components/admin/ui/admin-button";
import { StatusBadge } from "@/components/admin/ui/admin-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/admin/ui/admin-input";
import { Cpu, Zap, Bell, Mail, MoreHorizontal, Plus, Edit, Trash2, Play, Pause, Save, History, Timer, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Rule {
  id: string;
  name: string;
  triggerType: string;
  conditions: any;
  actionType: string;
  actionData: any;
  isActive: boolean;
  isNew?: boolean;
}

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery<{success: boolean, rules: Rule[]}>({
    queryKey: ["admin", "automations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/automations");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    }
  });

  const [localRules, setLocalRules] = React.useState<Rule[]>([]);

  React.useEffect(() => {
    if (data?.rules) {
      setLocalRules(data.rules.map(r => ({
        ...r,
        conditions: typeof r.conditions === "string" ? JSON.parse(r.conditions) : r.conditions,
        actionData: typeof r.actionData === "string" ? JSON.parse(r.actionData) : r.actionData,
      })));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (rule: Rule) => {
      const method = rule.isNew ? "POST" : "PUT";
      const res = await fetch("/api/admin/automations", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (!res.ok) throw new Error("Failed to save rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "automations"] });
    },
    onError: () => toast.error("حدث خطأ أثناء حفظ القاعدة")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/automations?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم حذف القاعدة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "automations"] });
    },
    onError: () => toast.error("حدث خطأ أثناء الحذف")
  });

  const handleAddRule = () => {
    setLocalRules([...localRules, {
      id: `temp_${Date.now()}`,
      name: "قاعدة أتمتة جديدة",
      triggerType: "ABSENCE_DAYS",
      conditions: { value: 3 },
      actionType: "SEND_NOTIFICATION",
      actionData: { message: "رسالة التنبيه هنا..." },
      isActive: true,
      isNew: true,
    }]);
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    setLocalRules(localRules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRule = (rule: Rule) => {
    if (rule.isNew) {
      setLocalRules(localRules.filter(r => r.id !== rule.id));
    } else {
      deleteMutation.mutate(rule.id);
    }
  };

  const saveAll = async () => {
    try {
      for (const rule of localRules) {
        await saveMutation.mutateAsync(rule);
      }
      toast.success("تم حفظ جميع التعديلات بنجاح!");
    } catch (e) {
      // errors handled by mutation
    }
  };

  const RuleCard = ({ rule, index }: { rule: Rule, index: number }) => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.05 }}
      >
        <AdminCard variant="glass" className="p-6 border-l-4 border-l-blue-500 overflow-visible relative group hover:border-l-primary transition-colors">
          <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
            <IconButton icon={Trash2} variant="destructive" size="sm" label="حذف القاعدة" onClick={() => deleteRule(rule)} />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pr-6">
            <div className="flex-1">
              <input 
                value={rule.name}
                onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                className="text-xl font-black bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors w-full sm:w-1/2 px-1"
                placeholder="اسم القاعدة..."
              />
              <p className="text-xs font-bold text-muted-foreground mt-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                تُنفذ تلقائياً في الخلفية (Background Job)
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 bg-accent/30 py-2 px-4 rounded-xl border border-border/50">
              <span className="text-sm font-bold">{rule.isActive ? 'نشط' : 'معطل'}</span>
              <Switch 
                checked={rule.isActive} 
                onCheckedChange={(c) => updateRule(rule.id, { isActive: c })}
              />
            </div>
          </div>

          <div className="bg-background/80 rounded-2xl p-6 border border-border relative">
            <div className="flex flex-col md:flex-row items-center gap-4 relative z-10 w-full md:w-auto">
              <div className="bg-blue-500 text-white font-black px-4 py-2 rounded-xl text-lg shrink-0 w-20 text-center shadow-[0_4px_20px_rgba(59,130,246,0.3)]">
                إذا
              </div>
              <Select value={rule.triggerType} onValueChange={(v) => updateRule(rule.id, { triggerType: v })}>
                <SelectTrigger className="w-full md:w-[250px] h-12 rounded-xl font-bold bg-card border-none ring-1 ring-border shadow-sm text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABSENCE_DAYS">غاب عن المنصة لمدة</SelectItem>
                  <SelectItem value="EXAM_FAILED_STREAK">رسب في اختبار متتالٍ مرات معدودة</SelectItem>
                  <SelectItem value="EXAMS_PASSED">اجتاز اختبارات بنجاح بمقدار</SelectItem>
                  <SelectItem value="XP_DROPPED">انخفضت نقاط الـ XP عن</SelectItem>
                </SelectContent>
              </Select>

              {["ABSENCE_DAYS", "EXAM_FAILED_STREAK", "EXAMS_PASSED", "XP_DROPPED"].includes(rule.triggerType) && (
                <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto mt-4 md:mt-0 px-2 lg:px-0">
                   <span className="text-sm font-bold text-muted-foreground mr-2">يساوي:</span>
                   <SearchInput 
                     type="number"
                     className="w-24 h-12 text-center text-lg font-black bg-card border-none ring-1 ring-border shadow-sm"
                     value={rule.conditions?.value || 0}
                     onChange={(e) => updateRule(rule.id, { conditions: { ...rule.conditions, value: parseInt(e.target.value) || 0 } })}
                   />
                </div>
              )}
            </div>

            <div className="flex items-center justify-center -my-2 opacity-50 relative z-0">
               <div className="w-px h-10 bg-gradient-to-b from-blue-500 to-emerald-500 mx-auto" />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 relative z-10 mt-2">
              <div className="bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-lg shrink-0 w-20 text-center shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
                قم بـ
              </div>
              <Select value={rule.actionType} onValueChange={(v) => updateRule(rule.id, { actionType: v })}>
                <SelectTrigger className="w-full md:w-[250px] h-12 rounded-xl font-bold bg-card border-none ring-1 ring-border shadow-sm text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEDUCT_XP_NOTIFY">خصم XP وإرسال تبليغ</SelectItem>
                  <SelectItem value="ADD_XP_NOTIFY">إضافة XP مكافأة وإرسال تهنئة</SelectItem>
                  <SelectItem value="SEND_NOTIFICATION">إرسال إشعار فقط</SelectItem>
                  <SelectItem value="MARK_AS_RISK">تصنيفه كـ "معرض للخطر" للمدير</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {["DEDUCT_XP_NOTIFY", "ADD_XP_NOTIFY", "SEND_NOTIFICATION"].includes(rule.actionType) && (
              <div className="mt-6 bg-accent/20 p-5 rounded-xl border border-border/50 grid gap-4 grid-cols-1 md:grid-cols-12 items-start transition-all">
                {rule.actionType.includes("XP") && (
                   <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">مقدار الـ XP</label>
                      <SearchInput 
                        type="number"
                        className="w-full bg-background border-border text-center font-black text-lg"
                        value={rule.actionData?.xpAmount || 0}
                        onChange={(e) => updateRule(rule.id, { actionData: { ...rule.actionData, xpAmount: parseInt(e.target.value) || 0 }})}
                      />
                   </div>
                )}
                <div className="md:col-span-9 space-y-2 w-full">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">رسالة التنبيه للمحارب</label>
                  <input
                    className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    placeholder="سيصل التنبيه لمركز إشعارات المحارب..."
                    value={rule.actionData?.message || ""}
                    onChange={(e) => updateRule(rule.id, { actionData: { ...rule.actionData, message: e.target.value }})}
                  />
                </div>
              </div>
            )}
          </div>
        </AdminCard>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="محرك القواعد (الأتمتة التلقائية)"
        description="صمم مسارات العمل والقواعد التلقائية للتعامل مع جيش المحاربين بصيغة الذكاء. النظام سيعمل بالنيابة عنك دون تدخل بشري."
      >
        <div className="flex items-center gap-3">
           <AdminButton variant="outline" icon={RefreshCw} onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "automations"] })} loading={isLoading}>
              تحديث
           </AdminButton>
           <AdminButton onClick={saveAll} icon={Save} loading={saveMutation.isPending}>حفظ جميع التعديلات</AdminButton>
        </div>
      </PageHeader>

      <div className="max-w-4xl mx-auto space-y-8">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground animate-pulse font-bold">جاري تحميل القواعد...</div>
        ) : (
          <AnimatePresence>
            {localRules.map((rule, idx) => (
              <RuleCard key={rule.id} rule={rule} index={idx} />
            ))}
          </AnimatePresence>
        )}

        {localRules.length === 0 && !isLoading && (
          <div className="py-20 text-center text-muted-foreground">لا توجد قواعد أتمتة محفوظة حالياً. استمتع بإنشاء القواعد الأولى!</div>
        )}

        <div className="pt-4 flex justify-center pb-12">
          <AdminButton 
             variant="outline" 
             size="lg" 
             className="rounded-2xl border-dashed border-2 bg-transparent hover:bg-primary/5 text-primary border-primary/40 px-12 h-14 font-black"
             icon={Plus}
             onClick={handleAddRule}
          >
            إضافة مسار أو قاعدة جديدة
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
