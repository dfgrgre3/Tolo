'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, Clock, CheckCircle2, Flame } from 'lucide-react';
import type { Task, StudySession } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  tasks: Task[];
  sessions: StudySession[];
}

export default function ProductivityReport({ tasks, sessions }: Props) {
  const heat = useMemo(() => {
    // last 84 days (12 weeks)
    const days: { date: Date; minutes: number; done: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({ date: d, minutes: 0, done: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.date.toDateString(), i]));
    sessions.forEach(s => {
      const k = new Date(s.startTime).toDateString();
      const j = idx.get(k);
      const day = j === undefined ? undefined : days[j];
      if (day) day.minutes += s.durationMin;
    });
    tasks.forEach(t => {
      if (!t.completedAt) return;
      const k = new Date(t.completedAt).toDateString();
      const j = idx.get(k);
      const day = j === undefined ? undefined : days[j];
      if (day) day.done += 1;
    });
    return days;
  }, [tasks, sessions]);

  const weekMin = useMemo(() => heat.slice(-7).reduce((a, d) => a + d.minutes, 0), [heat]);
  const weekDone = useMemo(() => heat.slice(-7).reduce((a, d) => a + d.done, 0), [heat]);
  const totalMin = useMemo(() => heat.reduce((a, d) => a + d.minutes, 0), [heat]);
  const bestDay = useMemo(() => heat.reduce((b, d) => (d.minutes > b.minutes ? d : b)), [heat]);
  const streak = useMemo(() => {
    let s = 0;
    for (let i = heat.length - 1; i >= 0; i--) {
      const day = heat[i];
      if (!day) continue;
      if (day.minutes > 0 || day.done > 0) s++;
      else if (i !== heat.length - 1) break;
    }
    return s;
  }, [heat]);

  const color = (m: number) =>
    m === 0 ? 'bg-white/5' :
    m < 30 ? 'bg-emerald-900/60' :
    m < 90 ? 'bg-emerald-700/70' :
    m < 180 ? 'bg-emerald-500/80' : 'bg-emerald-400';

  const exportCSV = () => {
    const rows = ['date,minutes,tasks_done', ...heat.map(d =>
      `${d.date.toISOString().slice(0, 10)},${d.minutes},${d.done}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'productivity-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Clock className="h-4 w-4" />, label: 'مذاكرة آخر 7 أيام', value: `${Math.round(weekMin / 60 * 10) / 10} س`, color: 'text-emerald-400' },
          { icon: <CheckCircle2 className="h-4 w-4" />, label: 'مهام منجزة (7 أيام)', value: `${weekDone}`, color: 'text-blue-400' },
          { icon: <Flame className="h-4 w-4" />, label: 'أيام متتالية نشطة', value: `${streak} يوم`, color: 'text-orange-400' },
          { icon: <TrendingUp className="h-4 w-4" />, label: 'أفضل يوم (84 يوم)', value: bestDay ? `${bestDay.minutes} د` : '—', color: 'text-violet-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-[#0a1628]/70 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/40">{s.label}</span>
                <span className={s.color}>{s.icon}</span>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <p className="text-[11px] text-white/30 mt-1">إجمالي 12 أسبوع: {Math.round(totalMin / 60 * 10) / 10} ساعة</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[#0a1628]/70 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-base">خريطة النشاط — آخر 12 أسبوع</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 ms-1" /> تصدير CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2" dir="ltr">
            {Array.from({ length: 12 }).map((_, w) => (
              <div key={w} className="flex flex-col gap-1">
                {heat.slice(w * 7, w * 7 + 7).map((d, di) => (
                  <div
                    key={di}
                    title={`${d.date.toLocaleDateString('ar-EG')} — ${d.minutes} دقيقة، ${d.done} مهام`}
                    className={cn('h-5 w-5 rounded-md border border-white/5', color(d.minutes))}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-white/40">
            <span>أقل</span>
            <div className="flex gap-1" dir="ltr">
              <div className="h-3 w-3 rounded bg-white/5 border border-white/5" />
              <div className="h-3 w-3 rounded bg-emerald-900/60" />
              <div className="h-3 w-3 rounded bg-emerald-700/70" />
              <div className="h-3 w-3 rounded bg-emerald-500/80" />
              <div className="h-3 w-3 rounded bg-emerald-400" />
            </div>
            <span>أكثر</span>
            {bestDay && <Badge variant="outline" className="ms-3">الأفضل: {bestDay.date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</Badge>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
