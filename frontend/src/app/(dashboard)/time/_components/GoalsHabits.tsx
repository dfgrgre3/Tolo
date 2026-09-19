'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Flame, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline?: string;
}
interface Habit {
  id: string;
  title: string;
  weekLog: boolean[]; // last 7 days
  streak: number;
}

const GOALS_KEY = 'time-goals-v1';
const HABITS_KEY = 'time-habits-v1';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

export default function GoalsHabits({ studyMinutesWeek }: { studyMinutesWeek: number }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [ready, setReady] = useState(false);
  const [gTitle, setGTitle] = useState('');
  const [gTarget, setGTarget] = useState('600');
  const [hTitle, setHTitle] = useState('');

  useEffect(() => {
    setGoals(load<Goal[]>(GOALS_KEY, [
      { id: 'g1', title: 'ساعات المذاكرة الأسبوعية', target: 600, current: 0, unit: 'دقيقة' },
      { id: 'g2', title: 'جلسات بومودورو', target: 20, current: 0, unit: 'جلسة' },
    ]));
    setHabits(load<Habit[]>(HABITS_KEY, [
      { id: 'h1', title: 'مراجعة يومية', weekLog: [true, true, false, true, false, false, false], streak: 2 },
      { id: 'h2', title: 'قراءة 30 دقيقة', weekLog: [true, false, true, false, false, false, false], streak: 1 },
    ]));
    setReady(true);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); }, [goals, ready]);
  useEffect(() => { if (ready) localStorage.setItem(HABITS_KEY, JSON.stringify(habits)); }, [habits, ready]);

  const syncedGoals = useMemo(() => goals.map(g =>
    g.id === 'g1' ? { ...g, current: Math.min(g.target, studyMinutesWeek) } : g
  ), [goals, studyMinutesWeek]);

  const addGoal = () => {
    if (!gTitle.trim()) { toast.error('اكتب اسم الهدف'); return; }
    const target = parseInt(gTarget, 10);
    if (!target || target <= 0) { toast.error('الهدف الرقمي غير صالح'); return; }
    setGoals(p => [...p, { id: `g${Date.now()}`, title: gTitle.trim(), target, current: 0, unit: 'دقيقة' }]);
    setGTitle(''); setGTarget('600');
    toast.success('تمت إضافة الهدف');
  };

  const addHabit = () => {
    if (!hTitle.trim()) { toast.error('اكتب اسم العادة'); return; }
    setHabits(p => [...p, { id: `h${Date.now()}`, title: hTitle.trim(), weekLog: [false, false, false, false, false, false, false], streak: 0 }]);
    setHTitle('');
    toast.success('تمت إضافة العادة');
  };

  const toggleHabitDay = (id: string, day: number) => {
    setHabits(p => p.map(h => {
      if (h.id !== id) return h;
      const weekLog = [...h.weekLog];
      weekLog[day] = !weekLog[day];
      // streak = consecutive true from end
      let streak = 0;
      for (let i = weekLog.length - 1; i >= 0; i--) {
        if (weekLog[i]) streak++; else break;
      }
      return { ...h, weekLog, streak };
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
      <div className="space-y-3">
        <h3 className="text-foreground flex items-center gap-2 text-base font-bold">
          <Target className="h-5 w-5 text-primary-strong" /> الأهداف الذكية
          <Badge variant="secondary">{syncedGoals.length}</Badge>
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="هدف جديد... مثال: حفظ 5 دروس" value={gTitle} onChange={e => setGTitle(e.target.value)} />
            <Input placeholder="الرقم" value={gTarget} onChange={e => setGTarget(e.target.value)} className="w-24" inputMode="numeric" />
            <Button onClick={addGoal} size="sm"><Plus className="h-4 w-4" /></Button>
          </div>
          {syncedGoals.map(g => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100));
            return (
              <div key={g.id} className="py-3 border-b border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-foreground">{g.title}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => setGoals(p => p.filter(x => x.id !== g.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{g.current} / {g.target} {g.unit}</span>
                  <span className="font-bold text-primary-strong">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2 bg-muted" />
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setGoals(p => p.map(x => x.id === g.id ? { ...x, current: Math.min(x.target, x.current + 1) } : x))}>+1</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setGoals(p => p.map(x => x.id === g.id ? { ...x, current: Math.min(x.target, x.current + 10) } : x))}>+10</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setGoals(p => p.map(x => x.id === g.id ? { ...x, current: 0 } : x))}>تصفير</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-foreground flex items-center gap-2 text-base font-bold">
          <Flame className="h-5 w-5 text-primary-strong" /> العادات اليومية
          <Badge variant="secondary">{habits.length}</Badge>
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="عادة جديدة... مثال: استيقاظ مبكر" value={hTitle} onChange={e => setHTitle(e.target.value)} />
            <Button onClick={addHabit} size="sm"><Plus className="h-4 w-4" /></Button>
          </div>
          <p className="text-[11px] text-muted-foreground">علّم على أيام الأسبوع (آخر 7 أيام) — السبت أولاً</p>
          {habits.map(h => (
            <div key={h.id} className="py-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-foreground">{h.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] text-orange-600 dark:text-orange-300">🔥 {h.streak}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => setHabits(p => p.filter(x => x.id !== h.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-1.5">
                {h.weekLog.map((done, i) => (
                  <button
                    key={i}
                    onClick={() => toggleHabitDay(h.id, i)}
                    className={`h-9 flex-1 rounded-lg border text-xs font-bold ${done ? 'bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-300' : 'bg-muted/60 border-border text-muted-foreground'}`}
                    title={`يوم ${i + 1}`}
                  >
                    {done ? <Check className="h-4 w-4 mx-auto" /> : `ي${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
