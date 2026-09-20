'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Target, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { useAIWorkspace } from '../context/AIWorkspaceContext';
import { pollAIJobResult } from '@/lib/pollJobResult';
import { apiRoutes } from '@/lib/api/routes';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { AISectionShell, AIError, AIResultHeader, AIEmptyState, HistoryBar, FieldLabel, useCopyText, downloadTextFile, loadLocal, saveLocal } from '../components/ai-shared';

const MIN_DAILY_HOURS = 1;
const MAX_DAILY_HOURS = 12;
const HISTORY_KEY = 'thanawy:ai:planner-history';

interface PlanHistory { examDate: string; targetGrade: string; dailyHours: number; plan: string; at: string }

export default function StudyPlanner() {
  const { generateStudyPlan, context } = useAIWorkspace();
  const [examDate, setExamDate] = useState('');
  const [subjectsText, setSubjectsText] = useState(context.subject ?? '');
  const [targetGrade, setTargetGrade] = useState('');
  const [dailyHours, setDailyHours] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PlanHistory[]>([]);
  const { copied, copy } = useCopyText();

  useEffect(() => {
    setHistory(loadLocal<PlanHistory[]>(HISTORY_KEY, []));
    if (context.subject) setSubjectsText((s) => s || context.subject!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pollSeconds, setPollSeconds] = useState(0);

  const minDate = new Date().toISOString().split('T')[0];

  const generatePlan = async () => {
    if (!examDate) { setError('اختر تاريخ الامتحان أولاً'); return; }
    setIsLoading(true);
    setError(null);
    setPlan(null);
    setPollSeconds(0);
    const startedAt = Date.now();
    const tick = window.setInterval(() => setPollSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    try {
      const subjects = subjectsText || context.subject || "مواد الثانوية العامة";
      // The backend requires a `message` field, so compose a full prompt from
      // the form fields alongside the structured data.
      const message = [
        "أنشئ لي خطة مذاكرة واقعية ومفصلة.",
        `تاريخ الامتحان: ${examDate}.`,
        `المواد: ${subjects}.`,
        targetGrade ? `الدرجة المستهدفة: ${targetGrade}%.` : null,
        `ساعات المذاكرة اليومية المتاحة: ${dailyHours}.`,
        context.year ? `السنة الدراسية: ${context.year}.` : null,
        "قسّم الخطة بالأسابيع والأيام مع مراجعات دورية ونصائح عملية.",
      ]
        .filter(Boolean)
        .join(" ");
      // Async job: the endpoint returns 202 + jobId in milliseconds, then the
      // worker runs the LLM call in the background (it can take a minute).
      const enq = await generateStudyPlan<{ jobId: string; status: string }>({
        message,
        examDate,
        subjects,
        targetGrade: targetGrade || undefined,
        dailyHours,
        year: context.year,
      });
      if (!enq?.jobId) { setError('فشل في إرسال الطلب. حاول مرة أخرى.'); return; }
      const payload = await pollAIJobResult<{ plan?: string; result?: string; reply?: string }>(
        enq.jobId,
        apiRoutes.ai.studyPlannerStatusBase,
        { intervalMs: 2000 },
      );
      const text = payload.plan ?? payload.result ?? payload.reply ?? '';
      if (!text) { setError('وصل رد فارغ من الخادم. حاول مرة أخرى.'); return; }
      setPlan(text);
      const entry: PlanHistory = { examDate, targetGrade, dailyHours, plan: text, at: new Date().toISOString() };
      const next = [entry, ...history].slice(0, 10);
      setHistory(next);
      saveLocal(HISTORY_KEY, next);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      logger.error('Failed to generate study plan:', e);
      const raw = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      setError(
        raw.includes('Message or image is required')
          ? 'تعذّر إرسال الطلب: أكمل تاريخ الامتحان والمواد ثم حاول مجدداً.'
          : raw,
      );
    } finally {
      window.clearInterval(tick);
      setIsLoading(false);
      setPollSeconds(0);
    }
  };

  return (
    <AISectionShell
      badge="AI Planner"
      title="مولد الخطط الدراسية الذكي"
      description="جدول واقعي حسب تاريخ امتحانك وموادك وساعاتك اليومية — محفوظ محلياً."
      icon={<CalendarDays className="h-6 w-6" />}
    >
      <HistoryBar
        items={history}
        onClear={() => { setHistory([]); saveLocal(HISTORY_KEY, []); }}
        onSelect={(h) => { setExamDate(h.examDate); setTargetGrade(h.targetGrade); setDailyHours(h.dailyHours); setPlan(h.plan); }}
        renderLabel={(h) => `خطة ${h.examDate} • ${h.dailyHours} س/يوم`}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <FieldLabel required>تاريخ الامتحان</FieldLabel>
          <div className="relative">
            <CalendarDays className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" min={minDate} value={examDate} onChange={(e) => setExamDate(e.target.value)} className="h-12 ps-10 rounded-xl" />
          </div>
        </div>
        <div>
          <FieldLabel>المواد (اختياري)</FieldLabel>
          <Input placeholder="مثال: فيزياء، كيمياء" value={subjectsText} onChange={(e) => setSubjectsText(e.target.value)} className="h-12 rounded-xl" />
        </div>
        <div>
          <FieldLabel>الدرجة المستهدفة %</FieldLabel>
          <div className="relative">
            <Target className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="number" min={50} max={100} placeholder="مثال: 95" value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} className="h-12 ps-10 rounded-xl" />
          </div>
        </div>
        <div>
          <FieldLabel>ساعات المذاكرة اليومية</FieldLabel>
          <div className="relative">
            <Clock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="number" min={MIN_DAILY_HOURS} max={MAX_DAILY_HOURS} value={dailyHours}
              onChange={(e) => {
                const p = parseInt(e.target.value, 10);
                setDailyHours(Number.isNaN(p) ? MIN_DAILY_HOURS : Math.min(MAX_DAILY_HOURS, Math.max(MIN_DAILY_HOURS, p)));
              }} className="h-12 ps-10 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <AIError message={error} onRetry={generatePlan} />
      </div>

      <Button onClick={generatePlan} disabled={isLoading || !examDate} className="mt-5 h-12 rounded-xl px-10 font-bold">
        {isLoading ? (<><Loader2 className="h-4 w-4 me-2 animate-spin" /> جاري التخطيط{pollSeconds > 0 ? ` (${pollSeconds} ث)` : '...'}...</>) : 'إنشاء الخطة الدراسية'}
      </Button>
      {isLoading && (
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          طلبك في قائمة المهام الخلفية — نستطلع النتيجة كل ثانيتين. يمكنك البقاء هنا حتى تكتمل الخطة (قد تستغرق دقيقة).
        </p>
      )}

      <div className="mt-6">
        {plan ? (
          <div>
            <AIResultHeader
              title="خطتك الدراسية المقترحة"
              copied={copied}
              onCopy={() => plan && copy(plan)}
              onDownload={() => plan && downloadTextFile('study-plan.txt', plan)}
              onReset={() => setPlan(null)}
            />
            <Card className="prose max-w-none rounded-2xl p-6 dark:prose-invert">
              <SafeMarkdown>{plan}</SafeMarkdown>
            </Card>
          </div>
        ) : (
          !isLoading && <AIEmptyState title="لا توجد خطة بعد" description="اختر تاريخ الامتحان وساعاتك اليومية ثم اضغط إنشاء الخطة. سيتم حفظ آخر 10 خطط على جهازك." />
        )}
      </div>
    </AISectionShell>
  );
}
