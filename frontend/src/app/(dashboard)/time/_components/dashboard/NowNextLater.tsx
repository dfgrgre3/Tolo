'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Clock, ChevronLeft } from 'lucide-react';
import { toHHMM, minutesSinceMidnight, type PlanItem } from '@/features/time/domain';

interface NowNextLaterProps {
  now: Date;
  items: PlanItem[];
  onStartTask?: (taskId?: string) => void;
}

/** Now / Next / Later strip derived from the generated daily plan. */
export default function NowNextLater({ now, items, onStartTask }: NowNextLaterProps) {
  const nowMin = minutesSinceMidnight(now);
  const current = items.find((i) => nowMin >= i.startMin && nowMin < i.endMin);
  const upcoming = items.filter((i) => i.startMin > nowMin);
  const next = upcoming[0];
  const later = upcoming.slice(1, 4);

  const range = (i: PlanItem) => `${toHHMM(i.startMin)} – ${toHHMM(i.endMin)}`;

  return (
    <Card className="h-full bg-background/40 backdrop-blur-xl border-border rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> الآن / التالي / لاحقًا
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 bg-muted/10 rounded-2xl border border-dashed border-border">
            لا توجد جلسات مخططة اليوم — أضف نوافذ دراسة في الجدول الأسبوعي أو مهامًا جديدة
          </p>
        ) : (
          <>
            {current ? (
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Badge className="bg-primary text-primary-foreground mb-1">الآن</Badge>
                  <div className="font-bold truncate">{current.title}</div>
                  <div className="text-xs text-muted-foreground">{range(current)}</div>
                </div>
                {current.taskId && onStartTask && (
                  <Button size="sm" className="shrink-0 gap-1" onClick={() => onStartTask(current.taskId)}>
                    <Play className="h-4 w-4" /> ابدأ
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد جلسة جارية الآن — استغل الوقت أو استرح قليلًا</p>
            )}

            {next && (
              <div className="p-3 rounded-2xl bg-muted/20 border border-border flex items-center gap-3">
                <Badge variant="secondary">التالي</Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{next.title}</div>
                  <div className="text-xs text-muted-foreground">{range(next)}</div>
                </div>
              </div>
            )}

            {later.length > 0 && (
              <div className="space-y-2">
                {later.map((item, idx) => (
                  <div
                    key={`${item.taskId ?? item.title}-${item.startMin}-${idx}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
                    <span className="tabular-nums">{range(item)}</span>
                    <span className="truncate">{item.title}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
