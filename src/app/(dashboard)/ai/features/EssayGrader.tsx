
// Re-build trigger: 2026-05-02

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { PenTool, GraduationCap, CheckCircle, AlertCircle, Loader2, Sparkles, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { safeFetch } from '@/lib/safe-client-utils';
import ReactMarkdown from 'react-markdown';

export default function EssayGrader() {
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Arabic');
  const [isLoading, setIsLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);

  const gradeEssay = async () => {
    setIsLoading(true);
    try {
      const { data } = await safeFetch<{ evaluation: string }>('/api/ai/grade-essay', {
        method: 'POST',
        body: JSON.stringify({ content, topic, language }),
      });
      if (data) setEvaluation(data.evaluation);
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
          <PenTool className="w-32 h-32 text-orange-500" />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 mb-4 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              Linguistic AI
            </Badge>
            <h2 className="text-3xl font-black text-white">مُصحح التعبير واللغات</h2>
            <p className="text-gray-400 mt-2 font-medium">احصل على تقييم فوري وتصحيح لغوي دقيق لمواضيع التعبير الخاصة بك.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-2">موضوع التعبير</label>
              <Input 
                placeholder="عنوان الموضوع..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bg-white/5 border-white/10 rounded-2xl h-14 text-white" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-2">اللغة</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 text-white">
                  <SelectValue placeholder="اختر اللغة" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10 text-white">
                  <SelectItem value="Arabic">اللغة العربية</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="French">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Textarea 
              placeholder="اكتب موضوعك هنا..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] bg-white/5 border-white/10 rounded-3xl p-6 text-white text-lg leading-relaxed focus:ring-orange-500/50"
            />
            
            <Button 
              onClick={gradeEssay}
              disabled={isLoading || content.length < 100}
              className="w-full md:w-auto px-12 h-14 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  جاري التقييم...
                </>
              ) : (
                <>
                  <GraduationCap className="w-5 h-5 mr-3" />
                  تقييم الموضوع الآن
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {evaluation && (
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-xl border border-orange-500/30">
              <Sparkles className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-xl font-black text-white">نتائج التقييم الذكي</h3>
          </div>

          <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem] prose prose-invert max-w-none">
            <ReactMarkdown>{evaluation}</ReactMarkdown>
          </Card>
        </m.div>
      )}
    </div>
  );
}
