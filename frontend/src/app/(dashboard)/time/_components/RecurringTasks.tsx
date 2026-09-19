'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Repeat, Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import { logger } from '@/lib/logger';
import type { Task } from '../types';
import { buildTaskPayload, mergeServerTask } from './_components/task-utils';

export interface RecurringRule {
  id: string;
  title: string;
  subject?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedTime: number;
  pattern: 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM_DAYS';
  days?: number[]; // 0=Sun..6=Sat for WEEKLY/CUSTOM_DAYS
  time: string; // HH:mm
  active: boolean;
  lastGenerated?: string; // yyyy-mm-dd
}

const KEY = 'time-recurring-rules-v1';
const DAY_NAMES = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function load(): RecurringRule[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecurringRule[]) : [];
  } catch { return []; }
}

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function shouldGenerateToday(rule: RecurringRule, now = new Date()): boolean {
  if (!rule.active) return false;
  if (rule.lastGenerated === todayKey(now)) return false;
  const day = now.getDay();
  switch (rule.pattern) {
    case 'DAILY': return true;
    case 'WEEKDAYS': return day !== 5 && day !== 6; // إجازة جمعة وسبت
    case 'WEEKLY': return rule.days?.includes(day) ?? day === 6;
    case 'CUSTOM_DAYS': return rule.days?.includes(day) ?? false;
  }
}

interface Props {
  subjects: string[];
  onTaskCreate?: (task: Task) => void;
}

export default function RecurringTasks({ subjects, onTaskCreate }: Props) {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState('');
  const [pattern, setPattern] = useState<RecurringRule['pattern']>('DAILY');
  const [priority, setPriority] = useState<RecurringRule['priority']>('MEDIUM');
  const [time, setTime] = useState('18:00');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRules(load());
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(rules)); }, [rules, ready]);

  const addRule = () => {
    if (!title.trim()) return toast.error('اكتب اسم المهمة المتكررة');
    setRules(p => [...p, {
      id: `r${Date.now()}`, title: title.trim(),
      priority, pattern, time, estimatedTime: 30,
      days: pattern === 'WEEKLY' ? [6] : [],
      active: true,
    }]);
    setTitle('');
    toast.success('تمت إضافة القاعدة');
  };

  const generateForRule = async (rule: RecurringRule): Promise<boolean> => {
    const [h, m] = rule.time.split(':').map(Number);
    const due = new Date();
    due.setHours(h || 18, m || 0, 0, 0);
    const local: Task = {
      id: '',
      title: rule.title,
      dueAt: due.toISOString(),
      priority: rule.priority,
      estimatedTime: rule.estimatedTime,
      tags: ['متكررة'],
      status: 'PENDING',
    };
    try {
      const saved = await apiClient.postJson<Task>(apiRoutes.tasks.create, buildTaskPayload(local));
      onTaskCreate?.(mergeServerTask(local, saved));
      return true;
    } catch (e) {
      logger.error('recurring generate failed', e);
      return false;
    }
  };

  const generateToday = async () => {
    setBusy(true);
    let n = 0;
    const next = [...rules];
    for (let i = 0; i < next.length; i++) {
      if (shouldGenerateToday(next[i])) {
        const ok = await generateForRule(next[i]);
        if (ok) { n++; next[i] = { ...next[i], lastGenerated: todayKey() }; }
      }
    }
    setRules(next);
    setBusy(false);
    if (n > 0) toast.success(`تم توليد ${n} مهمة لليوم`);
    else toast.info('لا توجد مهام متكررة مستحقة اليوم');
  };

  // توليد تلقائي مرة واحدة عند فتح الصفحة
  useEffect(() => {
    if (!ready || rules.length === 0) return;
    const due = rules.some(r => shouldGenerateToday(r));
    if (due) generateToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="space-y-3">
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-foreground text-base font-bold flex items-center gap-2">
          <Repeat className="h-5 w-5 text-blue-600 dark:text-blue-400" /> المهام المتكررة
          <Badge variant="secondary">{rules.length}</Badge>
        </h3>
        <Button size="sm" onClick={generateToday} disabled={busy}>
          <Zap className="h-4 w-4 ms-1" /> {busy ? 'جارٍ التوليد...' : 'توليد مهام اليوم'}
        </Button>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input placeholder="مثال: مراجعة إنجليزي" value={title} onChange={e => setTitle(e.target.value)} className="md:col-span-2" />
          <Select value={pattern} onValueChange={v => setPattern(v as RecurringRule['pattern'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">يوميًا</SelectItem>
              <SelectItem value="WEEKDAYS">أيام الدراسة (أحد–خميس)</SelectItem>
              <SelectItem value="WEEKLY">أسبوعيًا (السبت)</SelectItem>
              <SelectItem value="CUSTOM_DAYS">أيام مخصصة (السبت)</SelectItem>
            </SelectContent>
          </Select>
          <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          <Button onClick={addRule} size="sm"><Plus className="h-4 w-4" /> إضافة</Button>
        </div>
        <div className="flex gap-2 items-center">
          <Label className="text-xs text-muted-foreground">الأولوية للقاعدة الجديدة:</Label>
          <Select value={priority} onValueChange={v => setPriority(v as RecurringRule['priority'])}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">منخفضة</SelectItem>
              <SelectItem value="MEDIUM">متوسطة</SelectItem>
              <SelectItem value="HIGH">عالية</SelectItem>
              <SelectItem value="URGENT">عاجلة</SelectItem>
            </SelectContent>
          </Select>
          {subjects.length > 0 && <span className="text-[11px] text-muted-foreground">تُنشأ المهام المولدة بدون مادة — حددها عند الإنشاء</span>}
        </div>

        {rules.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد قواعد بعد — أضف مهمة تتكرر تلقائيًا كل يوم</p>}
        {rules.map(r => (
          <div key={r.id} className="py-3 border-b border-border flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-foreground">{r.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {r.pattern === 'DAILY' ? 'يوميًا' : r.pattern === 'WEEKDAYS' ? 'أحد–خميس' : r.pattern === 'WEEKLY' ? 'أسبوعيًا' : `أيام: ${(r.days ?? []).map(d => DAY_NAMES[d]).join('، ') || '—'}`} • {r.time} • {r.priority}
                {r.lastGenerated && <span className="ms-2 text-primary-strong">آخر توليد: {r.lastGenerated}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={r.active} onCheckedChange={v => setRules(p => p.map(x => x.id === r.id ? { ...x, active: v } : x))} />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => setRules(p => p.filter(x => x.id !== r.id))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
