"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RuleCard } from "./components/rule-card";
import { createNewRule, normalizeRule } from "./constants";
import { Rule } from "./types";

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const [localRules, setLocalRules] = React.useState<Rule[]>([]);

  const { data, isLoading } = useQuery<{ success: boolean; rules: Rule[] }>({
    queryKey: ["admin", "automations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/automations");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  React.useEffect(() => {
    if (data?.rules) {
      setLocalRules(data.rules.map(normalizeRule));
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
    onError: () => toast.error("حدث خطأ أثناء حفظ القاعدة"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/automations?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم حذف القاعدة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "automations"] });
    },
    onError: () => toast.error("حدث خطأ أثناء الحذف"),
  });

  const handleAddRule = () => {
    setLocalRules((currentRules) => [...currentRules, createNewRule()]);
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    setLocalRules((currentRules) =>
      currentRules.map((rule) =>
        rule.id === id ? { ...rule, ...updates } : rule,
      ),
    );
  };

  const deleteRule = (rule: Rule) => {
    if (rule.isNew) {
      setLocalRules((currentRules) =>
        currentRules.filter((item) => item.id !== rule.id),
      );
      return;
    }

    deleteMutation.mutate(rule.id);
  };

  const saveAll = async () => {
    try {
      for (const rule of localRules) {
        await saveMutation.mutateAsync(rule);
      }
      toast.success("تم حفظ جميع التعديلات بنجاح!");
    } catch {
      // Errors are handled in the mutation callbacks.
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="محرك القواعد (الأتمتة التلقائية)"
        description="صمم مسارات العمل والقواعد التلقائية للتعامل مع جيش المحاربين بصيغة الذكاء. النظام سيعمل بالنيابة عنك دون تدخل بشري."
      >
        <div className="flex items-center gap-3">
          <AdminButton
            variant="outline"
            icon={RefreshCw}
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["admin", "automations"] })
            }
            loading={isLoading}
          >
            تحديث
          </AdminButton>
          <AdminButton
            onClick={saveAll}
            icon={Save}
            loading={saveMutation.isPending}
          >
            حفظ جميع التعديلات
          </AdminButton>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-4xl space-y-8">
        {isLoading ? (
          <div className="animate-pulse py-20 text-center font-bold text-muted-foreground">
            جاري تحميل القواعد...
          </div>
        ) : (
          <AnimatePresence>
            {localRules.map((rule, index) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={index}
                onUpdate={updateRule}
                onDelete={deleteRule}
              />
            ))}
          </AnimatePresence>
        )}

        {localRules.length === 0 && !isLoading && (
          <div className="py-20 text-center text-muted-foreground">
            لا توجد قواعد أتمتة محفوظة حالياً. استمتع بإنشاء القواعد الأولى!
          </div>
        )}

        <div className="flex justify-center pb-12 pt-4">
          <AdminButton
            variant="outline"
            size="lg"
            className="h-14 rounded-2xl border-2 border-dashed border-primary/40 bg-transparent px-12 font-black text-primary hover:bg-primary/5"
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
