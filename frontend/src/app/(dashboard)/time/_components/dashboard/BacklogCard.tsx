'use client';

/**
 * BacklogCard — the "Re-plan" loop surface: shows what slipped out of today's
 * plan (overdue / no-due / unscheduled) and the capacity-aware recovery plan.
 * Pure display of domain/backlog.ts output — every number is explainable.
 */

import { AlertTriangle, CalendarOff, Clock, History, Inbox, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BacklogAnalysis, BacklogItem, RecoveryPlan } from '@/features/time/domain';

interface BacklogCardProps {
  backlog: BacklogAnalysis;
  recovery: RecoveryPlan;
}

const REASON_META: Record<BacklogItem['reason'], { label: string; className: string }> = {
  OVERDUE: { label: 'متأخرة', className: 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30' },
  NO_DUE_DATE: { label: 'بلا موعد', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  UNSCHEDULED: { label: 'خارج الخطة', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
};

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function BacklogCard({ backlog, recovery }: BacklogCardProps) {
  const topItems = [...backlog.items]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (backlog.items.length === 0) {
    return (
      <div dir="rtl" className="rounded-3xl bg-card border border-border backdrop-blur-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Inbox className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">لا يوجد backlog</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          كل المهام مجدولة أو منجزة — لا عمل متراكم يحتاج تعافيًا.
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="rounded-3xl bg-card border border-border backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary-strong" />
          <h3 className="text-sm font-bold text-foreground">العمل المتراكم (Backlog)</h3>
        </div>
        <Badge variant="secondary" className="text-[11px]">{backlog.items.length} مهمة · {backlog.totalMin} د</Badge>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'متأخرة', value: backlog.overdueCount, icon: <AlertTriangle className="h-3.5 w-3.5" />, tone: 'text-red-500' },
          { label: 'بلا موعد', value: backlog.noDueCount, icon: <CalendarOff className="h-3.5 w-3.5" />, tone: 'text-blue-500' },
          { label: 'خارج الخطة', value: backlog.unscheduledCount, icon: <Clock className="h-3.5 w-3.5" />, tone: 'text-amber-500' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl bg-muted/60 border border-border p-3 text-center">
            <div className={`flex items-center justify-center gap-1 mb-1 ${c.tone}`}>{c.icon}</div>
            <div className="text-lg font-bold text-foreground">{c.value}</div>
            <div className="text-[10px] text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Top items by score */}
      <div className="space-y-2">
        {topItems.map((item) => (
          <div key={item.taskId} className="flex items-start justify-between gap-3 p-2.5 rounded-2xl bg-muted/50 border border-border">
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {item.reasons[0]}
                {item.daysRemaining !== null && item.daysRemaining < 0
                  ? ` · ${Math.abs(item.daysRemaining)} يوم تأخير`
                  : ''}
                {` · ${item.remainingMin} د متبقية`}
              </p>
            </div>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold ${REASON_META[item.reason].className}`}>
              {REASON_META[item.reason].label}
            </span>
          </div>
        ))}
        {backlog.items.length > topItems.length && (
          <p className="text-[11px] text-muted-foreground text-center">
            +{backlog.items.length - topItems.length} مهمة أخرى
          </p>
        )}
      </div>

      {/* Recovery plan */}
      <div className={`rounded-2xl border p-3 ${recovery.feasible ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className={`h-4 w-4 ${recovery.feasible ? 'text-emerald-500' : 'text-orange-500'}`} />
          <span className="text-xs font-bold text-foreground">خطة التعافي (7 أيام)</span>
        </div>
        <ul className="text-[11px] text-muted-foreground space-y-1 mb-2">
          {recovery.reasons.map((r, i) => <li key={i}>• {r}</li>)}
        </ul>
        {recovery.days.some((d) => d.assignedMin > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {recovery.days.filter((d) => d.assignedMin > 0).map((d) => (
              <span key={d.date} className="text-[10px] px-2 py-1 rounded-lg bg-muted/70 border border-border text-muted-foreground">
                {DAY_NAMES[d.day]}: <span className="font-bold text-foreground">{d.assignedMin}</span> د
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
