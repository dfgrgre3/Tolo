'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Play, AlertTriangle, Scale, Repeat, Coffee, ArrowUpCircle, ArrowDownCircle, CalendarClock, History } from 'lucide-react';
import type { Recommendation, RecommendationKind } from '@/features/time/domain';

const KIND_ICON: Record<RecommendationKind, typeof Lightbulb> = {
  study_now: Play,
  deadline_risk: AlertTriangle,
  overload: ArrowUpCircle,
  underload: ArrowDownCircle,
  reschedule: CalendarClock,
  subject_balance: Scale,
  consistency: Repeat,
  break: Coffee,
  backlog_recovery: History,
};

const KIND_TONE: Partial<Record<RecommendationKind, string>> = {
  deadline_risk: 'border-rose-500/30 bg-rose-500/5',
  overload: 'border-orange-500/30 bg-orange-500/5',
  study_now: 'border-primary/30 bg-primary/5',
  backlog_recovery: 'border-amber-500/30 bg-amber-500/5',
};

interface AdvisorRecommendationsProps {
  recommendations: Recommendation[];
  onStartTask?: (taskId?: string) => void;
}

/** Explainable, data-grounded recommendations (deterministic — no LLM). */
export default function AdvisorRecommendations({ recommendations, onStartTask }: AdvisorRecommendationsProps) {
  return (
    <Card className="h-full bg-background/40 backdrop-blur-xl border-border rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-400" /> توصيات المستشار
        </CardTitle>
        <CardDescription>كل توصية مبنية على بياناتك الحقيقية وقابلة للتفسير</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {recommendations.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 bg-muted/10 rounded-2xl border border-dashed border-border">
            لا توصيات حاليًا — أضف مهامًا ونوافذ دراسة ليعمل المستشار
          </p>
        ) : (
          recommendations.slice(0, 5).map((rec, idx) => {
            const Icon = KIND_ICON[rec.kind] ?? Lightbulb;
            return (
              <div
                key={`${rec.kind}-${rec.taskId ?? idx}`}
                className={`p-3 rounded-2xl border ${KIND_TONE[rec.kind] ?? 'border-border bg-muted/10'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{rec.title}</div>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {rec.reasons.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {rec.kind === 'study_now' && rec.taskId && onStartTask && (
                    <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => onStartTask(rec.taskId)}>
                      <Play className="h-3.5 w-3.5" /> ابدأ
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
