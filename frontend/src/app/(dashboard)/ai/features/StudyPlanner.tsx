
// Re-build trigger: 2026-05-02

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Calendar, Target, Clock, Sparkles, Loader2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { useAIWorkspace } from '../context/AIWorkspaceContext';
import { SafeMarkdown } from '@/components/SafeMarkdown';

const MIN_DAILY_HOURS = 0;
const MAX_DAILY_HOURS = 24;

export default function StudyPlanner() {
  const { generateStudyPlan } = useAIWorkspace();
  const [examDate, setExamDate] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [dailyHours, setDailyHours] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDailyHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    // An empty or non-numeric input yields NaN — clamp instead of forwarding
    // an invalid value to the backend.
    if (Number.isNaN(parsed)) {
      setDailyHours(MIN_DAILY_HOURS);
      return;
    }
    setDailyHours(Math.min(MAX_DAILY_HOURS, Math.max(MIN_DAILY_HOURS, parsed)));
  };

  const generatePlan = async () => {
    setIsLoading(true);
    setError(null);
    setPlan(null);
    try {
      const data = await generateStudyPlan<{ plan: string }>({ examDate, targetGrade, dailyHours });
      if (data?.plan) {
        setPlan(data.plan);
      } else {
        setError('لم يتم إنشاء خطة. حاول مرة أخرى.');
      }
    } catch (e) {
      logger.error('Failed to generate study plan:', e);
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('تعذر نسخ الخطة. حاول مرة أخرى.');
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
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest me-2">تاريخ الامتحان</label>
              <div className="relative">
                <Calendar className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  type="date" 
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-2xl ps-12 h-14 text-white focus:ring-primary/50" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest me-2">الدرجة المستهدفة (%)</label>
              <div className="relative">
                <Target className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  type="number" 
                  placeholder="مثال: 98"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-2xl ps-12 h-14 text-white" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest me-2">ساعات المذاكرة اليومية</label>
              <div className="relative">
                <Clock className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="number"
                  min={MIN_DAILY_HOURS}
                  max={MAX_DAILY_HOURS}
                  value={dailyHours}
                  onChange={handleDailyHoursChange}
                  className="bg-white/5 border-white/10 rounded-2xl ps-12 h-14 text-white"
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
                  <Loader2 className="w-5 h-5 me-3 animate-spin" />
                  جاري التخطيط...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 me-3" />
                  إنشاء الخطة الدراسية
                </>
              )}
            </Button>

            {error && (
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </m.div>
            )}
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
            <Button
              variant="ghost"
              onClick={handleCopy}
              className="text-gray-400 hover:text-white"
              title="نسخ الخطة"
            >
              {copied ? (
                <Check className="w-4 h-4 me-2 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 me-2" />
              )}
              {copied ? 'تم النسخ' : 'نسخ الخطة'}
            </Button>
          </div>

          <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-[2.5rem] prose prose-invert max-w-none">
            <SafeMarkdown>{plan}</SafeMarkdown>
          </Card>
        </m.div>
      )}
    </div>
  );
}
