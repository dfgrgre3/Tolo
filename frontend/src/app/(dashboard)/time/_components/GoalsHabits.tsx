'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Flame, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  habitStats,
  habitWeekCells,
  migrateV1Habit,
  toggleHabitDate,
  type HabitEntry,
} from '@/features/time/domain';
import { createHabit, deleteHabit, fetchHabits, updateHabit } from '@/features/time/api/time-gateway';
import { mergeById } from '@/features/time/api/sync-merge';
import { logger } from '@/lib/logger';

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline?: string;
}

const GOALS_KEY = 'time-goals-v1';
const HABITS_V1_KEY = 'time-habits-v1';
const HABITS_V2_KEY = 'time-habits-v2';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

/**
 * Fire-and-forget sync failure: the localStorage copy stays authoritative
 * for this session and every mutation the user repeats retries the server
 * write. Logged (not toasted) so an offline session isn't spammed.
 */
function syncWarn(scope: string, err: unknown): void {
  logger.warn(`[time/${scope}] server sync failed`, err);
}

export default function GoalsHabits({ studyMinutesWeek }: { studyMinutesWeek: number }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<HabitEntry[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const [gTitle, setGTitle] = useState('');
  const [gTarget, setGTarget] = useState('600');
  const [hTitle, setHTitle] = useState('');

  // `now` ticks per minute so streaks/day cells stay correct across midnight
  // (same cadence as useDailyPlan).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setGoals(load<Goal[]>(GOALS_KEY, [
      { id: 'g1', title: 'ساعات المذاكرة الأسبوعية', target: 600, current: 0, unit: 'دقيقة' },
      { id: 'g2', title: 'جلسات بومودورو', target: 20, current: 0, unit: 'جلسة' },
    ]));
    // v2 (date-anchored) wins; otherwise migrate v1 weekLogs onto real dates.
    const v2 = load<HabitEntry[] | null>(HABITS_V2_KEY, null);
    let localHabits: HabitEntry[];
    if (v2 && Array.isArray(v2)) {
      localHabits = v2;
    } else {
      const v1 = load<Array<{ id: string; title: string; weekLog: boolean[] }>>(HABITS_V1_KEY, [
        { id: 'h1', title: 'مراجعة يومية', weekLog: [true, true, false, true, false, false, false] },
        { id: 'h2', title: 'قراءة 30 دقيقة', weekLog: [true, false, true, false, false, false, false] },
      ]);
      localHabits = v1.map(h => migrateV1Habit(h, new Date()));
      localStorage.setItem(HABITS_V2_KEY, JSON.stringify(localHabits));
    }
    setHabits(localHabits);
    setReady(true);

    // Server hydration: paint from localStorage first (instant + offline),
    // then merge the server collection. Empty server + local rows means
    // first run — bootstrap the server from local; the endpoint upserts by
    // id (409 on replay), so a StrictMode double effect stays idempotent.
    void (async () => {
      try {
        const server = await fetchHabits();
        if (server.length === 0) {
          if (localHabits.length > 0) {
            await Promise.allSettled(localHabits.map(h => createHabit(h)));
          }
          return;
        }
        setHabits(prev => mergeById(prev, server));
      } catch (err) {
        logger.warn('[time/habits] server hydration skipped (offline?)', err);
      }
    })();
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); }, [goals, ready]);
  useEffect(() => { if (ready) localStorage.setItem(HABITS_V2_KEY, JSON.stringify(habits)); }, [habits, ready]);

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
    const entry: HabitEntry = { id: `h${Date.now()}`, title: hTitle.trim(), doneDates: [] };
    setHabits(p => [...p, entry]);
    setHTitle('');
    void createHabit(entry).catch(err => syncWarn('habits', err));
    toast.success('تمت إضافة العادة');
  };

  const toggleHabitDay = (id: string, dateKey: string) => {
    const current = habits.find(h => h.id === id);
    if (!current) return;
    const next = toggleHabitDate(current, dateKey);
    setHabits(p => p.map(h => (h.id === id ? next : h)));
    void updateHabit(id, { doneDates: next.doneDates }).catch(err => syncWarn('habits', err));
  };

  const removeHabit = (id: string) => {
    setHabits(p => p.filter(x => x.id !== id));
    void deleteHabit(id).catch(err => syncWarn('habits', err));
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
          <p className="text-[11px] text-muted-foreground">آخر 7 أيام (ح ن ث ر خ ج س حسب يومك) — انقر خلية لتعليم اليوم</p>
          {habits.map(h => {
            const stats = habitStats(h, now);
            const cells = habitWeekCells(h, now);
            return (
              <div key={h.id} className="py-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-foreground">{h.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] text-orange-600 dark:text-orange-300">🔥 {stats.streak}</Badge>
                    {stats.bestStreak > stats.streak && (
                      <Badge variant="outline" className="text-[11px] text-muted-foreground">🏆 {stats.bestStreak}</Badge>
                    )}
                    <Badge variant="outline" className="text-[11px] text-muted-foreground">{stats.consistencyPct}%</Badge>
                    {stats.perfectWeek && (
                      <Badge variant="outline" className="text-[11px] text-emerald-600 dark:text-emerald-400">أسبوع كامل</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => removeHabit(h.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {cells.map(cell => (
                    <button
                      key={cell.key}
                      onClick={() => toggleHabitDay(h.id, cell.key)}
                      className={`h-9 flex-1 rounded-lg border text-xs font-bold ${cell.done ? 'bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-300' : 'bg-muted/60 border-border text-muted-foreground'} ${cell.isToday ? 'ring-2 ring-primary-strong/60' : ''}`}
                      title={cell.isToday ? 'اليوم' : cell.key}
                    >
                      {cell.done ? <Check className="h-4 w-4 mx-auto" /> : cell.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
