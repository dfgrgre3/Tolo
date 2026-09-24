'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge } from 'lucide-react';
import type { WorkloadAnalysis, WorkloadStatus } from '@/features/time/domain';

const STATUS_META: Record<WorkloadStatus, { label: string; className: string }> = {
  UNDERLOADED: { label: 'خفيف', className: 'bg-sky-500/15 text-sky-500 border-sky-500/30' },
  BALANCED: { label: 'متوازن', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  HEAVY: { label: 'مزدحم', className: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  OVERLOADED: { label: 'مثقل', className: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  CRITICAL: { label: 'حرج', className: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
};

interface WorkloadCardProps {
  workload: WorkloadAnalysis;
  unscheduledCount: number;
}

/** Today's capacity vs demand, with the deterministic buffer split. */
export default function WorkloadCard({ workload, unscheduledCount }: WorkloadCardProps) {
  const meta = STATUS_META[workload.status];
  const pct = Number.isFinite(workload.utilization)
    ? Math.min(100, Math.round(workload.utilization * 100))
    : 100;

  return (
    <Card className="h-full bg-background/40 backdrop-blur-xl border-border rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
      <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" /> عبء اليوم
          </CardTitle>
          <CardDescription>السعة مقابل المطلوب (بعد احتياطي {Math.round(workload.bufferMin)} د)</CardDescription>
        </div>
        <Badge className={meta.className}>{meta.label}</Badge>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="h-3 rounded-full bg-muted/40 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              workload.status === 'CRITICAL' || workload.status === 'OVERLOADED'
                ? 'bg-rose-500'
                : workload.status === 'HEAVY'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="p-2 rounded-xl bg-muted/20">
            <div className="font-bold tabular-nums">{workload.plannedMin}</div>
            <div className="text-xs text-muted-foreground">مخطط (د)</div>
          </div>
          <div className="p-2 rounded-xl bg-muted/20">
            <div className="font-bold tabular-nums">{workload.capacityMin}</div>
            <div className="text-xs text-muted-foreground">السعة (د)</div>
          </div>
          <div className="p-2 rounded-xl bg-muted/20">
            <div className="font-bold tabular-nums">{unscheduledCount}</div>
            <div className="text-xs text-muted-foreground">لا تتسع اليوم</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
