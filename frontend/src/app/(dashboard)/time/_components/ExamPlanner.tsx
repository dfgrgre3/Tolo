'use client';

/**
 * ExamPlanner — countdown, readiness, and a weakness × proximity revision
 * queue for user-declared exams. Exam dates are user-declared and
 * server-persisted via /api/v1/exam-plans (localStorage keeps the offline
 * cache); all analysis comes from the pure domain/exam-plan.ts engine.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, GraduationCap, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  assessExamReadiness,
  buildRevisionQueue,
  examCountdown,
  localDateKey,
  markTopicRevised,
  type ExamPlanRecord,
  type ExamTopic,
  type ExamUrgency,
} from '@/features/time/domain';
import { toPlannableTask } from '@/features/time/adapters';
import { createExamPlan, deleteExamPlan, fetchExamPlans, updateExamPlan } from '@/features/time/api/time-gateway';
import { mergeById } from '@/features/time/api/sync-merge';
import { logger } from '@/lib/logger';
import type { Task } from '../types';

const EXAMS_KEY = 'exam-plans';

const URGENCY_LABEL: Record<ExamUrgency, string> = {
  PAST: 'فات',
  TODAY: 'اليوم',
  CLOSE: 'قريب',
  SCHEDULED: 'مجدول',
};

const URGENCY_BADGE: Record<ExamUrgency, string> = {
  PAST: 'bg-muted text-muted-foreground border-border',
  TODAY: 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30',
  CLOSE: 'bg-orange-500/15 text-orange-500 dark:text-orange-400 border-orange-500/30',
  SCHEDULED: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function uid(): string {
  return `exam_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/** Fire-and-forget sync failure: the localStorage copy stays authoritative
 * for this session; logged (not toasted) so offline sessions aren't spammed. */
function syncWarn(scope: string, err: unknown): void {
  logger.warn(`[time/${scope}] server sync failed`, err);
}

export default function ExamPlanner({ tasks }: { tasks: Task[] }) {
  const [exams, setExams] = useState<ExamPlanRecord[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [examAt, setExamAt] = useState('');
  const [topicsText, setTopicsText] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const local = load<ExamPlanRecord[]>(EXAMS_KEY, []);
    setExams(local);
    setReady(true);

    // Server hydration: paint from localStorage first (instant + offline),
    // then merge. Empty server + local rows = first run → bootstrap; the
    // endpoint upserts by id (409 on replay) so double effects stay safe.
    void (async () => {
      try {
        const server = await fetchExamPlans();
        if (server.length === 0) {
          if (local.length > 0) {
            await Promise.allSettled(local.map(e => createExamPlan(e)));
          }
          return;
        }
        setExams(prev => mergeById(prev, server));
      } catch (err) {
        logger.warn('[time/exam-plans] server hydration skipped (offline?)', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
  }, [exams, ready]);

  const plannable = useMemo(() => tasks.map(toPlannableTask), [tasks]);
  const queue = useMemo(() => buildRevisionQueue(exams, now), [exams, now]);
  const todayKey = localDateKey(now);

  const addExam = () => {
    const t = title.trim();
    if (!t) {
      toast.error('اكتب اسم الامتحان');
      return;
    }
    if (!examAt) {
      toast.error('حدد تاريخ ووقت الامتحان');
      return;
    }
    const when = new Date(examAt);
    if (Number.isNaN(when.getTime())) {
      toast.error('تاريخ الامتحان غير صالح');
      return;
    }
    const topics: ExamTopic[] = topicsText
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s, i) => ({ id: `t_${Date.now()}_${i}`, title: s, confidence: 50 }));
    const entry: ExamPlanRecord = {
      id: uid(),
      title: t,
      subject: subject.trim() || undefined,
      examAt: when.toISOString(),
      topics,
    };
    setExams((p) => [...p, entry]);
    void createExamPlan(entry).catch((err) => syncWarn('exam-plans', err));
    setTitle('');
    setSubject('');
    setExamAt('');
    setTopicsText('');
    toast.success('تمت إضافة الامتحان');
  };

  // Debounced per-exam topic sync: slider drags fire onChange per tick, so
  // a drag settles into one PATCH instead of dozens. The latest topics
  // snapshot rides with the timer so unmount can still flush it.
  const topicSyncTimers = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; topics: ExamTopic[] }>());

  const scheduleTopicsSync = (examId: string, topics: ExamTopic[]) => {
    const timers = topicSyncTimers.current;
    const pending = timers.get(examId);
    if (pending) clearTimeout(pending.timer);
    const timer = setTimeout(() => {
      timers.delete(examId);
      void updateExamPlan(examId, { topics }).catch((err) => syncWarn('exam-plans', err));
    }, 400);
    timers.set(examId, { timer, topics });
  };

  // Flush any pending debounced sync when the planner unmounts.
  useEffect(() => {
    const timers = topicSyncTimers.current;
    return () => {
      for (const [examId, pending] of timers) {
        clearTimeout(pending.timer);
        void updateExamPlan(examId, { topics: pending.topics }).catch((err) => syncWarn('exam-plans', err));
      }
      timers.clear();
    };
  }, []);

  const removeExam = (id: string) => {
    const pending = topicSyncTimers.current.get(id);
    if (pending) { clearTimeout(pending.timer); topicSyncTimers.current.delete(id); }
    setExams((p) => p.filter((e) => e.id !== id));
    void deleteExamPlan(id).catch((err) => syncWarn('exam-plans', err));
    toast.warning('تم حذف الامتحان');
  };

  const revise = (examId: string, topicId: string) => {
    const current = exams.find((e) => e.id === examId);
    if (!current) return;
    const next = markTopicRevised(current, topicId, now);
    setExams((p) => p.map((e) => (e.id === examId ? next : e)));
    // Cancel any debounced confidence drag so its older topics snapshot
    // can't overwrite the fresh revision just recorded.
    const pending = topicSyncTimers.current.get(examId);
    if (pending) { clearTimeout(pending.timer); topicSyncTimers.current.delete(examId); }
    void updateExamPlan(examId, { topics: next.topics }).catch((err) => syncWarn('exam-plans', err));
    toast.success('سُجّلت المراجعة اليوم');
  };

  const setConfidence = (examId: string, topicId: string, value: number) => {
    const current = exams.find((e) => e.id === examId);
    if (!current) return;
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    const next: ExamPlanRecord = {
      ...current,
      topics: current.topics.map((tp) => (tp.id === topicId ? { ...tp, confidence: clamped } : tp)),
    };
    setExams((p) => p.map((e) => (e.id === examId ? next : e)));
    scheduleTopicsSync(examId, next.topics);
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Add exam */}
      <div className="rounded-3xl bg-card border border-border backdrop-blur-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary-strong" />
          <h3 className="text-sm font-bold text-foreground">إضافة امتحان</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="اسم الامتحان... مثال: نقل الحركة" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="المادة (اختياري)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Input
            type="datetime-local"
            value={examAt}
            onChange={(e) => setExamAt(e.target.value)}
            aria-label="تاريخ ووقت الامتحان"
          />
          <Input
            placeholder="الموضوعات مفصولة بفواصل: اشتقاق، تكامل..."
            value={topicsText}
            onChange={(e) => setTopicsText(e.target.value)}
          />
        </div>
        <Button onClick={addExam} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 ms-1" /> إضافة
        </Button>
        <p className="text-[11px] text-muted-foreground">
          التواريخ تُحفظ على جهازك فقط — العد التنازلي والجاهزية مشتقّان من بياناتك الحقيقية.
        </p>
      </div>

      {/* Exams */}
      {exams.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          لا توجد امتحانات مجدولة بعد — أضف امتحانًا لتتبّع العد التنازلي والجاهزية.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {exams.map((exam) => {
            const cd = examCountdown(exam, now);
            const readiness = assessExamReadiness(exam, plannable, now);
            return (
              <div key={exam.id} className="rounded-3xl bg-card border border-border backdrop-blur-xl p-5 space-y-4">
                {/* Countdown header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground truncate">{exam.title}</p>
                      <Badge variant="outline" className={`text-[11px] ${URGENCY_BADGE[cd.urgency]}`}>
                        {URGENCY_LABEL[cd.urgency]}
                        {cd.daysRemaining >= 0 ? ` · ${cd.daysRemaining} يوم` : ''}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {cd.reasons[0]}
                      {exam.subject ? ` · ${exam.subject}` : ''} ·{' '}
                      {new Date(exam.examAt).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-400"
                    onClick={() => removeExam(exam.id)}
                    title="حذف الامتحان"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Readiness */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">الجاهزية</span>
                    <span className="font-bold text-foreground">{readiness.score}%</span>
                  </div>
                  <Progress value={readiness.score} className="h-2 bg-muted" />
                  <ul className="text-[11px] text-muted-foreground space-y-0.5">
                    {readiness.reasons.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>

                {/* Topics */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">الموضوعات ({exam.topics.length})</p>
                  {exam.topics.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      لا موضوعات بعد — أضفها مفصولة بفواصل عند إنشاء الامتحان.
                    </p>
                  )}
                  {exam.topics.map((tp) => {
                    const revisedToday = tp.lastRevisedOn === todayKey;
                    return (
                      <div key={tp.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/60 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{tp.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={tp.confidence}
                              onChange={(e) => setConfidence(exam.id, tp.id, Number(e.target.value))}
                              className="h-1 flex-1 accent-orange-500"
                              aria-label={`نسبة إتقان ${tp.title}`}
                            />
                            <span className="text-[10px] text-muted-foreground w-8 text-center">{tp.confidence}%</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 shrink-0 ${revisedToday ? 'text-emerald-500' : 'text-muted-foreground hover:text-emerald-500'}`}
                          disabled={revisedToday}
                          onClick={() => revise(exam.id, tp.id)}
                          title={revisedToday ? 'تمت المراجعة اليوم' : 'سجّل مراجعة اليوم'}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Revision queue — weakness × proximity, straight from the engine */}
      <div className="rounded-3xl bg-card border border-border backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-foreground">طابور المراجعة</h3>
          <Badge variant="secondary" className="text-[11px]">{queue.length}</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">مرتبة بضعف الموضوع × قرب الموعد.</p>
        {queue.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            لا شيء للمراجعة الآن — أضف امتحانًا قادمًا يحتوي موضوعات.
          </p>
        ) : (
          <div className="space-y-2">
            {queue.slice(0, 8).map((item) => (
              <div
                key={`${item.examId}:${item.topicId}`}
                className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-muted/50 border border-border"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {item.title}
                    {item.subject ? <span className="text-muted-foreground font-normal"> · {item.subject}</span> : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.reasons.join(' · ')}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 shrink-0 text-[11px]" onClick={() => revise(item.examId, item.topicId)}>
                  <Check className="h-3 w-3 ms-1" /> تمت
                </Button>
              </div>
            ))}
            {queue.length > 8 && (
              <p className="text-[11px] text-muted-foreground text-center">
                +{queue.length - 8} موضوع آخر في الطابور
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

