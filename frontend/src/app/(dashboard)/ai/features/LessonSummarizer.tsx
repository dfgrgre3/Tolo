'use client';

import { useState, useEffect } from 'react';
import { BookOpenText, Loader2, ListChecks, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIWorkspace } from '../context/AIWorkspaceContext';
import { pollAIJobResult } from '@/lib/pollJobResult';
import { apiRoutes } from '@/lib/api/routes';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import { AISectionShell, AIError, AIResultHeader, HistoryBar, FieldLabel, useCopyText, downloadTextFile, loadLocal, saveLocal } from '../components/ai-shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SummaryPayload { summary?: string; result?: string }
interface SumHistory { title: string; summary: string; at: string }

const HISTORY_KEY = 'thanawy:ai:summarizer-history';

function splitSummary(markdown: string): { prose: string; mermaid: string | null } {
  const match = markdown.match(/```mermaid\s*\n?([\s\S]*?)```/i);
  const diagram = match?.[1];
  const mermaid = diagram ? diagram.trim() : null;
  const prose = markdown.replace(/```mermaid\s*\n?[\s\S]*?```/gi, '').trim();
  return { prose, mermaid };
}

export default function LessonSummarizer() {
  const { summarize } = useAIWorkspace();
  const [content, setContent] = useState('');
  const [level, setLevel] = useState('متوسط');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SumHistory[]>([]);
  const { copied, copy } = useCopyText();

  useEffect(() => { setHistory(loadLocal<SumHistory[]>(HISTORY_KEY, [])); }, []);

  const generateSummary = async () => {
    if (content.trim().length < 50) { setError('الصق نصاً لا يقل عن 50 حرفاً للحصول على تلخيص جيد'); return; }
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      const data = await summarize<{ jobId: string; status: string }>({ content: content.trim(), level });
      if (!data?.jobId) { setError('فشل في إرسال الطلب. حاول مرة أخرى.'); return; }
      const payload = await pollAIJobResult<SummaryPayload & { status: string }>(data.jobId, apiRoutes.ai.summarizeStatusBase, { intervalMs: 1500 });
      const text = payload.summary ?? payload.result ?? '';
      if (!text) { setError('وصل رد فارغ من الخادم. حاول بنص أطول.'); return; }
      setSummary(text);
      const entry: SumHistory = { title: content.slice(0, 60), summary: text, at: new Date().toISOString() };
      const next = [entry, ...history].slice(0, 10);
      setHistory(next);
      saveLocal(HISTORY_KEY, next);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  const { prose, mermaid } = splitSummary(summary ?? '');

  return (
    <AISectionShell
      badge="Smart Summarizer"
      title="ملخص الدروس الذكي"
      description="حوّل الدروس الطويلة إلى نقاط مركزة + خريطة ذهنية (Mermaid) في ثوانٍ."
      icon={<BookOpenText className="h-6 w-6" />}
    >
      <HistoryBar
        items={history}
        onClear={() => { setHistory([]); saveLocal(HISTORY_KEY, []); }}
        onSelect={(h) => setSummary(h.summary)}
        renderLabel={(h) => h.title}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
        <div>
          <FieldLabel required>نص الدرس (50 حرف على الأقل)</FieldLabel>
          <Textarea
            placeholder="الصق نص الدرس أو المقال هنا..."
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 15000))}
            className="min-h-[180px] rounded-2xl p-5 text-base leading-relaxed"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{content.length}/15000 حرف</span>
            <span>{content.trim().length < 50 ? `متبقٍ ${50 - content.trim().length} حرف للبدء` : 'جاهز للتلخيص ✓'}</span>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <FieldLabel>مستوى التلخيص</FieldLabel>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="مختصر">مختصر جداً</SelectItem>
                <SelectItem value="متوسط">متوسط</SelectItem>
                <SelectItem value="مفصل">مفصّل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generateSummary} disabled={isLoading || content.trim().length < 50} className="h-12 w-full rounded-xl font-bold">
            {isLoading ? (<><Loader2 className="h-4 w-4 me-2 animate-spin" /> جاري التلخيص...</>) : 'تلخيص الدرس الآن'}
          </Button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">نستخدم نظام المهام الخلفية: يُرسل طلبك فوراً ثم نستطلع النتيجة كل 1.5 ثانية.</p>
        </div>
      </div>

      <div className="mt-4"><AIError message={error} onRetry={generateSummary} /></div>

      {summary && (
        <div className="mt-6">
          <AIResultHeader
            title="المخرجات الذكية"
            copied={copied}
            onCopy={() => summary && copy(summary)}
            onDownload={() => summary && downloadTextFile('summary.md', summary, 'text/markdown;charset=utf-8')}
            onReset={() => setSummary(null)}
          />
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="mb-4 h-11 rounded-xl border border-border bg-muted p-1">
              <TabsTrigger value="summary" className="rounded-lg px-6"><ListChecks className="h-4 w-4 me-2" />الملخص</TabsTrigger>
              <TabsTrigger value="mindmap" className="rounded-lg px-6"><Map className="h-4 w-4 me-2" />الخريطة الذهنية</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <Card className="prose max-w-none rounded-2xl p-6 dark:prose-invert">
                <SafeMarkdown>{prose || 'لا يوجد نص ملخص.'}</SafeMarkdown>
              </Card>
            </TabsContent>
            <TabsContent value="mindmap">
              <Card className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl p-6 text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Map className="h-6 w-6" /></div>
                <h4 className="font-bold">كود المخطط (Mermaid)</h4>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">الصقه في Mermaid Live Editor لرؤية الرسم، أو انسخه لمشروعك.</p>
                <pre dir="ltr" className="mt-4 max-h-64 w-full overflow-auto rounded-xl bg-muted p-4 text-left text-xs">{mermaid || 'لا يوجد مخطط حالياً'}</pre>
                {mermaid && <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={() => copy(mermaid)}>{copied ? 'تم النسخ ✓' : 'نسخ الكود'}</Button>}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AISectionShell>
  );
}
