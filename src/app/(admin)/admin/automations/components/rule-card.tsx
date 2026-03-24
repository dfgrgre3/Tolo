"use client";

import { IconButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { SearchInput } from "@/components/admin/ui/admin-input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { Trash2, Zap } from "lucide-react";
import {
  actionOptions,
  messageActionTypes,
  quantitativeTriggers,
  triggerOptions,
} from "../constants";
import { Rule } from "../types";

interface RuleCardProps {
  rule: Rule;
  index: number;
  onUpdate: (id: string, updates: Partial<Rule>) => void;
  onDelete: (rule: Rule) => void;
}

export function RuleCard({
  rule,
  index,
  onUpdate,
  onDelete,
}: RuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <AdminCard
        variant="glass"
        className="group relative overflow-visible border-l-4 border-l-blue-500 p-6 transition-colors hover:border-l-primary"
      >
        <div className="absolute top-4 left-4 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton
            icon={Trash2}
            variant="destructive"
            size="sm"
            label="حذف القاعدة"
            onClick={() => onDelete(rule)}
          />
        </div>

        <div className="mb-6 flex flex-col justify-between gap-4 pr-6 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              value={rule.name}
              onChange={(e) => onUpdate(rule.id, { name: e.target.value })}
              className="w-full border-b border-transparent bg-transparent px-1 text-xl font-black transition-colors hover:border-border focus:border-primary focus:outline-none sm:w-1/2"
              placeholder="اسم القاعدة..."
            />
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Zap className="h-3 w-3 text-amber-500" />
              تنفذ تلقائيا في الخلفية (Background Job)
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/50 bg-accent/30 px-4 py-2">
            <span className="text-sm font-bold">
              {rule.isActive ? "نشط" : "معطل"}
            </span>
            <Switch
              checked={rule.isActive}
              onCheckedChange={(checked) =>
                onUpdate(rule.id, { isActive: checked })
              }
            />
          </div>
        </div>

        <div className="relative rounded-2xl border border-border bg-background/80 p-6">
          <div className="relative z-10 flex w-full flex-col items-center gap-4 md:w-auto md:flex-row">
            <div className="w-20 shrink-0 rounded-xl bg-blue-500 px-4 py-2 text-center text-lg font-black text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)]">
              إذا
            </div>
            <Select
              value={rule.triggerType}
              onValueChange={(value) => onUpdate(rule.id, { triggerType: value })}
            >
              <SelectTrigger className="h-12 w-full rounded-xl border-none bg-card text-right font-bold shadow-sm ring-1 ring-border md:w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {triggerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {quantitativeTriggers.has(rule.triggerType) && (
              <div className="mt-4 flex w-full items-center justify-between gap-2 px-2 md:mt-0 md:w-auto md:justify-start lg:px-0">
                <span className="mr-2 text-sm font-bold text-muted-foreground">
                  يساوي:
                </span>
                <SearchInput
                  type="number"
                  className="h-12 w-24 border-none bg-card text-center text-lg font-black shadow-sm ring-1 ring-border"
                  value={rule.conditions?.value || 0}
                  onChange={(e) =>
                    onUpdate(rule.id, {
                      conditions: {
                        ...rule.conditions,
                        value: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className="relative z-0 -my-2 flex items-center justify-center opacity-50">
            <div className="mx-auto h-10 w-px bg-gradient-to-b from-blue-500 to-emerald-500" />
          </div>

          <div className="relative z-10 mt-2 flex flex-col items-center gap-4 md:flex-row">
            <div className="w-20 shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-center text-lg font-black text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
              قم بـ
            </div>
            <Select
              value={rule.actionType}
              onValueChange={(value) => onUpdate(rule.id, { actionType: value })}
            >
              <SelectTrigger className="h-12 w-full rounded-xl border-none bg-card text-right font-bold shadow-sm ring-1 ring-border md:w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {messageActionTypes.has(rule.actionType) && (
            <div className="mt-6 grid grid-cols-1 items-start gap-4 rounded-xl border border-border/50 bg-accent/20 p-5 transition-all md:grid-cols-12">
              {rule.actionType.includes("XP") && (
                <div className="space-y-2 md:col-span-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    مقدار الـ XP
                  </label>
                  <SearchInput
                    type="number"
                    className="w-full border-border bg-background text-center text-lg font-black"
                    value={rule.actionData?.xpAmount || 0}
                    onChange={(e) =>
                      onUpdate(rule.id, {
                        actionData: {
                          ...rule.actionData,
                          xpAmount: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                  />
                </div>
              )}
              <div className="w-full space-y-2 md:col-span-9">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  رسالة التنبيه للمحارب
                </label>
                <input
                  className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  placeholder="سيصل التنبيه لمركز إشعارات المحارب..."
                  value={rule.actionData?.message || ""}
                  onChange={(e) =>
                    onUpdate(rule.id, {
                      actionData: {
                        ...rule.actionData,
                        message: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </AdminCard>
    </motion.div>
  );
}
