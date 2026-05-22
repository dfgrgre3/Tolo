
// Re-build trigger: 2026-05-02

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Calendar, Target, Clock, Sparkles, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { safeFetch } from '@/lib/safe-client-utils';
import ReactMarkdown from 'react-markdown';

export default function StudyPlanner() {
  const [examDate, setExamDate] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [dailyHours, setDailyHours] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  const generatePlan = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await safeFetch<{ plan: string }>('/api/ai/study-planner', {
        method: 'POST',
        body: JSON.stringify({ examDate, targetGrade, dailyHours }),
      });
      if (data) setPlan(data.plan);
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
          <Calendar className="w-32 h-32 text-primary" />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <Badge className="bg-primary/20 text-primary border-primary/30 mb-4 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              AI Planner
            </Badge>
            <h2 className="text-3xl font-black text-white">مولد الخطط الدراسية الذكي</h2>
            <p className="text-gray-400 mt-2 font-medium">سأقوم ببناء جدول مثالي لك بناءً على أهدافك ومواعيد امتحاناتك.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-2">تاريخ الامتحان</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  type="date" 
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-2xl pl-12 h-14 text-white focus:ring-primary/50" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-2">الدرجة المستهدفة (%)</label>
              <div className="relative">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  type="number" 
                  placeholder="مثال: 98"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-2xl pl-12 h-14 text-white" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-2">ساعات المذاكرة اليومية</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  type="number" 
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseInt(e.target.value))}
                  className="bg-white/5 border-white/10 rounded-2xl pl-12 h-14 text-white" 
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={generatePlan}
            disabled={isLoading || !examDate}
            className="w-full md:w-auto px-12 h-14 bg-primary hover:bg-primary/90 text-black font-black rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                جاري التخطيط...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-3" />
                إنشاء الخطة الدراسية
              </>
            )}
          </Button>
        </div>
      </Card>

      {plan && (
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-white">خطتك الدراسية المقترحة</h3>
            </div>
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <Download className="w-4 h-4 mr-2" />
              تحميل PDF
            </Button>
          </div>

          <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem] prose prose-invert max-w-none">
            <ReactMarkdown>{plan}</ReactMarkdown>
          </Card>
        </m.div>
      )}
    </div>
  );
}
