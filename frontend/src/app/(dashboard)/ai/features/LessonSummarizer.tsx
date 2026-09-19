'use client';

// Re-build trigger: 2026-06-06 — Async job queue pattern

import React, { useState } from 'react';
import { FileText, Map, Sparkles, Copy, Check, Loader2, ListChecks, Brain, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIWorkspace } from '../context/AIWorkspaceContext';
import { pollAIJobResult } from '@/lib/pollJobResult';
import { apiRoutes } from '@/lib/api/routes';
import { SafeMarkdown } from '@/components/SafeMarkdown';

interface SummaryPayload {
  summary?: string;
  result?: string;
}

/**
 * Split an LLM summary into its prose and Mermaid diagram parts.
 *
 * The model often emits the diagram as a ```mermaid fenced block, either at
 * the start or the end of the response. The previous implementation assumed
 * the prose always came first (`summary.split('```')[0]`), which rendered an
 * empty summary tab whenever the diagram led the response, and used a
 * non-null assertion that would crash on a truncated stream.
 */
function splitSummary(markdown: string): { prose: string; mermaid: string | null } {
  const match = markdown.match(/```mermaid\s*\n?([\s\S]*?)```/i);
  // The capture group always participates when the pattern matches, but
  // noUncheckedIndexedAccess types match[1] as string | undefined; a truncated
  // stream must degrade to "no diagram" rather than throw.
  const diagram = match?.[1];
  const mermaid = diagram ? diagram.trim() : null;
  const prose = markdown.replace(/```mermaid\s*\n?[\s\S]*?```/gi, '').trim();
  return { prose, mermaid };
}

export default function LessonSummarizer() {
  const { summarize } = useAIWorkspace();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      // Step 1 — enqueue the job (returns 202 + jobId in < 50 ms)
      const data = await summarize<{ jobId: string; status: string }>({ content });

      if (!data?.jobId) {
        setError('فشل في إرسال الطلب. حاول مرة أخرى.');
        return;
      }

      // Step 2 — poll every 1.5 s until completed/failed
      const payload = await pollAIJobResult<SummaryPayload & { status: string }>(
        data.jobId,
        apiRoutes.ai.summarizeStatusBase,
        { intervalMs: 1500 },
      );

      setSummary(payload.summary ?? payload.result ?? '');
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('تعذر نسخ النص. حاول مرة أخرى.');
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem] overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <FileText className="w-32 h-32 text-blue-500" />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mb-4 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              Smart Summarizer
            </Badge>
            <h2 className="text-3xl font-black text-white">ملخص الدروس الذكي</h2>
            <p className="text-gray-400 mt-2 font-medium">حول الدروس الطويلة إلى نقاط مركزة وخرائط ذهنية في ثوانٍ.</p>
          </div>

          <div className="space-y-4">
            <Textarea 
              placeholder="الصق نص الدرس أو المقال هنا..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] bg-white/5 border-white/10 rounded-3xl p-6 text-white text-lg leading-relaxed focus:ring-blue-500/50"
            />
            
            <Button 
              onClick={generateSummary}
              disabled={isLoading || content.length < 50}
              className="w-full md:w-auto px-12 h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 me-3 animate-spin" />
                  جاري التلخيص... (قد يستغرق بضع ثوانٍ)
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 me-3" />
                  تلخيص الدرس الآن
                </>
              )}
            </Button>
          </div>

          {error && (
            <div
              className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      </Card>

      {summary && (
        <div
          className="space-y-6">
          <Tabs defaultValue="summary" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <Brain className="w-6 h-6 text-blue-400" />
                المخرجات الذكية
              </h3>
              <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl h-12">
                <TabsTrigger value="summary" className="rounded-xl px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <ListChecks className="w-4 h-4 me-2" />
                  الملخص
                </TabsTrigger>
                <TabsTrigger value="mindmap" className="rounded-xl px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Map className="w-4 h-4 me-2" />
                  الخريطة الذهنية
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary">
              <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem] prose prose-invert max-w-none relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="absolute top-6 end-6 text-gray-500 hover:text-white"
                  title="نسخ الملخص"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
                <SafeMarkdown>{splitSummary(summary).prose || 'لا يوجد نص ملخص.'}</SafeMarkdown>
              </Card>
            </TabsContent>

            <TabsContent value="mindmap">
              <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem] flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-blue-500/10 rounded-full inline-block">
                    <Map className="w-12 h-12 text-blue-400" />
                  </div>
                  <h4 className="text-xl font-bold text-white">رؤية المخطط الذهني</h4>
                  <p className="text-gray-400 text-sm max-w-md">يمكنك استخدام الكود المولد أدناه في Mermaid Live Editor لرؤية الرسم التوضيحي، أو سيتم عرضه هنا قريباً.</p>
                  <pre className="mt-6 p-4 bg-black/40 rounded-xl text-xs text-blue-300 text-left overflow-x-auto max-w-full">
                    {splitSummary(summary).mermaid || 'لا يوجد مخطط حالياً'}
                  </pre>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
