'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Save, AlertCircle } from 'lucide-react';
import {
  toHHMM,
  type AnnotatedPlanItem,
  type DailyPlan,
  type PlanItemState,
  type PlanProgressSummary,
} from '@/features/time/domain';

interface DailyPlanCardProps {
  plan: DailyPlan;
  /** Derived execution progress; falls back to the raw plan when absent. */
  progressItems?: AnnotatedPlanItem[];
  progressSummary?: PlanProgressSummary;
  isSaving: boolean;
  onSave: () => void;
}

const STATE_BADGE: Record<PlanItemState, { label: string; className: string }> = {
  COMPLETED: { label: 'تمت', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  STARTED: { label: 'بدأت', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  ACTIVE: { label: 'الآن', className: 'bg-primary/15 text-primary' },
  MISSED: { label: 'فاتت', className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
  UPCOMING: { label: 'قادمة', className: 'bg-muted text-muted-foreground' },
  ELAPSED: { label: 'انتهت', className: 'bg-muted text-muted-foreground' },
};

/** The full generated daily plan with explainable placement reasons. */
export default function DailyPlanCard({ plan, progressItems, progressSummary, isSaving, onSave }: DailyPlanCardProps) {
  const items: AnnotatedPlanItem[] =
    progressItems ?? plan.items.map((item) => ({ ...item, progress: { state: 'UPCOMING', loggedMin: 0, plannedMin: item.endMin - item.startMin } }));
  return (
    <Card className="h-full bg-background/40 backdrop-blur-xl border-border rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
      <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" /> خطة اليوم الذكية
          </CardTitle>
          <CardDescription>
            {plan.items.length} جلسة · {plan.plannedMin} د مخططة · احتياطي {plan.bufferMin} د
            {progressSummary && progressSummary.totalItems > 0 && (
              <> · نُفِّذ {progressSummary.completedItems}/{progressSummary.totalItems} · الالتزام {progressSummary.adherencePct}%</>
            )}
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" disabled={isSaving || plan.items.length === 0} onClick={onSave} className="gap-1 shrink-0">
          <Save className="h-4 w-4" /> {isSaving ? 'جارٍ الحفظ…' : 'حفظ الخطة'}
        </Button>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {plan.items.length === 0 && plan.unscheduled.length === 0 && (
          <p className="text-center text-muted-foreground py-6 bg-muted/10 rounded-2xl border border-dashed border-border">
            لا توجد مهام مفتوحة أو نوافذ دراسة لهذا اليوم
          </p>
        )}

        {items.map((item, idx) => {
          const badge = STATE_BADGE[item.progress.state];
          return (
          <div key={`${item.taskId ?? item.title}-${item.startMin}-${idx}`} className="p-3 rounded-2xl bg-muted/20 border border-border">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className={`shrink-0 text-[10px] ${badge.className}`}>{badge.label}</Badge>
                <div className="font-medium text-sm truncate">{item.title}</div>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {toHHMM(item.startMin)} – {toHHMM(item.endMin)}
                {item.taskId && item.progress.loggedMin > 0 && ` · ${item.progress.loggedMin}/${item.progress.plannedMin} د`}
              </span>
            </div>
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {item.reasons.slice(0, 3).map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
          );
        })}

        {plan.unscheduled.length > 0 && (
          <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
              <AlertCircle className="h-4 w-4" /> لم تتسع اليوم ({plan.unscheduled.length})
            </div>
            {plan.unscheduled.map((u) => (
              <div key={u.taskId} className="text-xs text-muted-foreground">
                • {u.title} — {u.reason}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
