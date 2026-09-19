'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react';
import type { Task, StudySession, Reminder } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  tasks: Task[];
  sessions: StudySession[];
  reminders: Reminder[];
}

const WEEKDAYS = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
// Saturday-first layout for Egypt

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function keyOf(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function TimeCalendar({ tasks, sessions, reminders }: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    // Convert JS day (0=Sun) to Saturday-first offset: Sat=0
    const offset = (first.getDay() + 1) % 7;
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(first.getFullYear(), first.getMonth(), 1 - offset + i));
    }
    return days;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, { tasks: Task[]; sessions: StudySession[]; reminders: Reminder[] }>();
    const ensure = (d: Date) => {
      const k = keyOf(d);
      if (!map.has(k)) map.set(k, { tasks: [], sessions: [], reminders: [] });
      return map.get(k)!;
    };
    tasks.forEach(t => {
      if (!t.dueAt) return;
      ensure(new Date(t.dueAt)).tasks.push(t);
    });
    sessions.forEach(s => ensure(new Date(s.startTime)).sessions.push(s));
    reminders.forEach(r => ensure(new Date(r.remindAt)).reminders.push(r));
    return map;
  }, [tasks, sessions, reminders]);

  const selectedData = byDay.get(keyOf(selected)) ?? { tasks: [], sessions: [], reminders: [] };
  const monthMinutes = useMemo(() => sessions
    .filter(s => { const d = new Date(s.startTime); return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear(); })
    .reduce((a, s) => a + s.durationMin, 0), [sessions, cursor]);

  const monthLabel = cursor.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" dir="rtl">
      <div className="lg:col-span-2">
        <div className="flex flex-row items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-foreground font-bold">
            <CalendarDays className="h-5 w-5 text-primary-strong" />
            {monthLabel}
            <Badge variant="secondary" className="ms-2">{Math.round(monthMinutes / 60 * 10) / 10} ساعة مذاكرة</Badge>
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setCursor(new Date()); setSelected(new Date()); }}>اليوم</Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-muted-foreground font-bold">
            {WEEKDAYS.map(w => <div key={w} className="py-2">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const info = byDay.get(keyOf(d));
              const count = (info?.tasks.length ?? 0) + (info?.sessions.length ?? 0) + (info?.reminders.length ?? 0);
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, new Date());
              return (
                <button
                  key={i}
                  onClick={() => setSelected(d)}
                  className={cn(
                    'min-h-[72px] rounded-xl border p-1.5 text-start',
                    inMonth ? 'bg-card border-border' : 'bg-transparent border-border opacity-40',
                    isSel ? 'border-orange-500/60 bg-orange-500/10' : '',
                    isToday ? 'border-blue-500/50' : ''
                  )}
                >
                  <div className={cn('text-sm font-bold', isToday ? 'text-blue-600 dark:text-blue-400' : 'text-foreground')}>{d.getDate()}</div>
                  {info && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {info.tasks.length > 0 && <span className="h-2 w-2 rounded-full bg-amber-400" title={`${info.tasks.length} مهام`} />}
                      {info.sessions.length > 0 && <span className="h-2 w-2 rounded-full bg-orange-400" title={`${info.sessions.length} جلسات`} />}
                      {info.reminders.length > 0 && <span className="h-2 w-2 rounded-full bg-violet-400" title={`${info.reminders.length} تذكيرات`} />}
                    </div>
                  )}
                  {count > 0 && <div className="text-[10px] text-muted-foreground mt-1">{count} عناصر</div>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> مهام</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" /> جلسات</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" /> تذكيرات</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-foreground text-base font-bold mb-3">
          تفاصيل {selected.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        <div className="space-y-4 max-h-[560px] overflow-y-auto">
          <div>
            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">المهام ({selectedData.tasks.length})</h4>
            {selectedData.tasks.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد مهام مستحقة</p> :
              selectedData.tasks.map(t => (
                <div key={t.id} className="py-1.5 border-b border-border">
                  <p className="text-sm text-foreground font-medium">{t.title}</p>
                  <div className="flex gap-1 mt-1">
                    {t.status && <Badge variant="outline" className="text-[10px]">{t.status}</Badge>}
                    {t.priority && <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>}
                  </div>
                </div>
              ))}
          </div>
          <div>
            <h4 className="text-xs font-bold text-primary-strong mb-2">الجلسات ({selectedData.sessions.length})</h4>
            {selectedData.sessions.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد جلسات</p> :
              selectedData.sessions.map(s => (
                <div key={s.id} className="py-1.5 border-b border-border text-xs text-foreground/80">
                  {s.durationMin} دقيقة • {new Date(s.startTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </div>
              ))}
          </div>
          <div>
            <h4 className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-2">التذكيرات ({selectedData.reminders.length})</h4>
            {selectedData.reminders.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد تذكيرات</p> :
              selectedData.reminders.map(r => (
                <div key={r.id} className="py-1.5 border-b border-border">
                  <p className="text-sm text-foreground font-medium">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(r.remindAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
