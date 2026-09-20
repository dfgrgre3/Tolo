'use client';

import { useState, useEffect } from 'react';
import { PenLine, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAIWorkspace } from '../context/AIWorkspaceContext';
import { pollAIJobResult } from '@/lib/pollJobResult';
import { apiRoutes } from '@/lib/api/routes';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { AISectionShell, AIError, AIResultHeader, HistoryBar, FieldLabel, useCopyText, downloadTextFile, loadLocal, saveLocal } from '../components/ai-shared';

interface EvaluationPayload { evaluation?: string; result?: string }
interface GradeHistory { topic: string; evaluation: string; at: string }
const HISTORY_KEY = 'thanawy:ai:grader-history';

export default function EssayGrader() {
  const { gradeEssay: requestGradeEssay } = useAIWorkspace();
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Arabic');
  const [isLoading, setIsLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GradeHistory[]>([]);
  const { copied, copy } = useCopyText();

  useEffect(() => { setHistory(loadLocal<GradeHistory[]>(HISTORY_KEY, [])); }, []);

  const gradeEssay = async () => {
    if (content.trim().length < 100) { setError('اكتب موضوعاً لا يقل عن 100 حرف للحصول على تقييم دقيق'); return; }
    setIsLoading(true);
    setError(null);
    setEvaluation(null);
    try {
      const data = await requestGradeEssay<{ jobId: string; status: string }>({ content: content.trim(), topic: topic.trim() || undefined, language });
      if (!data?.jobId) { setError('فشل في إرسال الطلب. حاول مرة أخرى.'); return; }
      const payload = await pollAIJobResult<EvaluationPayload & { status: string }>(data.jobId, apiRoutes.ai.gradeEssayStatusBase, { intervalMs: 1500 });
      const text = payload.evaluation ?? payload.result ?? '';
      if (!text) { setError('وصل رد فارغ. حاول مرة أخرى.'); return; }
      setEvaluation(text);
      const next = [{ topic: topic || content.slice(0, 50), evaluation: text, at: new Date().toISOString() }, ...history].slice(0, 10);
      setHistory(next);
      saveLocal(HISTORY_KEY, next);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AISectionShell
      badge="Linguistic AI"
      title="مُصحح التعبير واللغات"
      description="تقييم فوري: الدرجة، الأخطاء اللغوية، نقاط القوة، وخطة التحسين."
      icon={<PenLine className="h-6 w-6" />}
    >
      <HistoryBar
        items={history}
        onClear={() => { setHistory([]); saveLocal(HISTORY_KEY, []); }}
        onSelect={(h) => { setTopic(h.topic); setEvaluation(h.evaluation); }}
        renderLabel={(h) => h.topic.slice(0, 40)}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <FieldLabel>موضوع التعبير</FieldLabel>
          <Input placeholder="عنوان الموضوع..." value={topic} onChange={(e) => setTopic(e.target.value.slice(0, 200))} className="h-12 rounded-xl" />
        </div>
        <div>
          <FieldLabel>اللغة</FieldLabel>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="اختر اللغة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Arabic">اللغة العربية</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="French">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4">
        <FieldLabel required>نص الموضوع (100 حرف على الأقل)</FieldLabel>
        <Textarea
          placeholder="اكتب موضوعك هنا..."
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 12000))}
          className="min-h-[220px] rounded-2xl p-5 text-base leading-relaxed"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>{content.length}/12000</span>
          <span>{content.trim().length < 100 ? `متبقٍ ${100 - content.trim().length} حرف` : `عدد الكلمات ≈ ${content.trim().split(/\s+/).length} ✓`}</span>
        </div>
      </div>

      <div className="mt-4"><AIError message={error} onRetry={gradeEssay} /></div>

      <Button onClick={gradeEssay} disabled={isLoading || content.trim().length < 100} className="mt-4 h-12 rounded-xl px-10 font-bold">
        {isLoading ? (<><Loader2 className="h-4 w-4 me-2 animate-spin" /> جاري التقييم...</>) : 'تقييم الموضوع الآن'}
      </Button>

      {evaluation && (
        <div className="mt-6">
          <AIResultHeader
            title="نتائج التقييم الذكي"
            copied={copied}
            onCopy={() => evaluation && copy(evaluation)}
            onDownload={() => evaluation && downloadTextFile('evaluation.md', evaluation, 'text/markdown;charset=utf-8')}
            onReset={() => setEvaluation(null)}
          />
          <Card className="prose max-w-none rounded-2xl p-6 dark:prose-invert">
            <SafeMarkdown>{evaluation}</SafeMarkdown>
          </Card>
        </div>
      )}
    </AISectionShell>
  );
}
