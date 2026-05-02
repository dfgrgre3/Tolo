'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { FileText, Map, Sparkles, Copy, Loader2, ListChecks, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { safeFetch } from '@/lib/safe-client-utils';
import ReactMarkdown from 'react-markdown';

export default function LessonSummarizer() {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const generateSummary = async () => {
    setIsLoading(true);
    try {
      const { data } = await safeFetch<{ summary: string }>('/api/ai/summarize', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      if (data) setSummary(data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
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
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  جاري التلخيص...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-3" />
                  تلخيص الدرس الآن
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {summary && (
        <m.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6">
          <Tabs defaultValue="summary" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <Brain className="w-6 h-6 text-blue-400" />
                المخرجات الذكية
              </h3>
              <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl h-12">
                <TabsTrigger value="summary" className="rounded-xl px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <ListChecks className="w-4 h-4 mr-2" />
                  الملخص
                </TabsTrigger>
                <TabsTrigger value="mindmap" className="rounded-xl px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Map className="w-4 h-4 mr-2" />
                  الخريطة الذهنية
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary">
              <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem] prose prose-invert max-w-none relative">
                <Button variant="ghost" size="icon" className="absolute top-6 left-6 text-gray-500 hover:text-white">
                  <Copy className="w-4 h-4" />
                </Button>
                <ReactMarkdown>{summary.split('```')[0]}</ReactMarkdown>
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
                    {summary.includes('```mermaid') ? summary.split('```mermaid')[1].split('```')[0] : 'لا يوجد مخطط حالياً'}
                  </pre>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </m.div>
      )}
    </div>
  );
}
