'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LayoutTemplate, Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { createTaskRaw } from '@/features/tasks/api/tasks-gateway';
import { logger } from '@/lib/logger';
import type { Task } from '../types';
import { buildTaskPayload, mergeServerTask } from './_components/task-utils';

interface Template {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedTime: number;
  subtasks: string[];
  tags: string[];
  custom?: boolean;
}

const BUILT_IN: Template[] = [
  {
    id: 't-exam', name: 'حل امتحان سابق', title: 'حل امتحان {مادة} السابق',
    description: 'حل امتحان كامل بتوقيت حقيقي ثم تصحيح الأخطاء وتسجيلها.',
    priority: 'HIGH', estimatedTime: 120,
    subtasks: ['تجهيز ورق الإجابة والمؤقت', 'الحل بتوقيت الامتحان', 'التصحيح وتسجيل الأخطاء', 'مراجعة نقاط الضعف'],
    tags: ['امتحان', 'تدريب'],
  },
  {
    id: 't-memorize', name: 'حفظ درس جديد', title: 'حفظ درس جديد في {مادة}',
    description: 'قراءة + تسميع + تكرار متباعد على 3 جلسات.',
    priority: 'MEDIUM', estimatedTime: 60,
    subtasks: ['قراءة الدرس بتركيز', 'تسميع ذاتي أول', 'تسميع ذاتي ثانٍ بعد راحة', 'اختبار سريع'],
    tags: ['حفظ'],
  },
  {
    id: 't-summary', name: 'تلخيص فصل', title: 'تلخيص فصل في {مادة}',
    description: 'استخراج المفاهيم والقوانين في ملخص من صفحة واحدة.',
    priority: 'MEDIUM', estimatedTime: 45,
    subtasks: ['تحديد العناوين الرئيسية', 'استخراج القوانين/التعاريف', 'كتابة الملخص', 'مراجعة الملخص'],
    tags: ['تلخيص'],
  },
  {
    id: 't-night', name: 'مراجعة ليلة الامتحان', title: 'مراجعة ليلة امتحان {مادة}',
    description: 'مراجعة الملخصات + أهم المسائل + نوم مبكر.',
    priority: 'URGENT', estimatedTime: 90,
    subtasks: ['مراجعة الملخص', 'حل أهم 10 مسائل', 'مراجعة أخطاء سابقة', 'تجهيز أدوات الامتحان والنوم مبكرًا'],
    tags: ['ليلة الامتحان'],
  },
  {
    id: 't-weak', name: 'معالجة نقطة ضعف', title: 'معالجة نقطة ضعف في {مادة}',
    description: 'تشخيص السبب ثم تدريب مركز حتى الإتقان.',
    priority: 'HIGH', estimatedTime: 50,
    subtasks: ['تحديد الخطأ بدقة', 'مراجعة الشرح', 'حل 5 مسائل مشابهة', 'اختبار تحقق'],
    tags: ['تقوية'],
  },
];

const KEY = 'time-custom-templates-v1';

interface Props {
  onTaskCreate?: (task: Task) => void;
}

export default function TaskTemplates({ onTaskCreate }: Props) {
  const [custom, setCustom] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCustom(JSON.parse(raw) as Template[]);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(custom)); }, [custom]);

  // NOTE: intentionally NOT named `use*` — this is a plain event handler,
  // not a React Hook. The `use` prefix trips react-hooks/rules-of-hooks.
  const applyTemplate = async (t: Template) => {
    setBusyId(t.id);
    const due = new Date();
    due.setHours(23, 59, 0, 0);
    const local: Task = {
      id: '',
      title: t.title.replace('{مادة} ', '').replace('{مادة}', '').trim() || t.name,
      description: t.description,
      priority: t.priority,
      estimatedTime: t.estimatedTime,
      tags: t.tags,
      dueAt: due.toISOString(),
      status: 'PENDING',
      subtasks: t.subtasks.map((s, i) => ({
        id: `sub_${Date.now()}_${i}`,
        title: s,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      })),
    };
    try {
      const saved = await createTaskRaw<Task>(buildTaskPayload(local));
      const next = mergeServerTask(local, saved);
      onTaskCreate?.(next);
      toast.success(`تم إنشاء مهمة من قالب "${t.name}" مع ${t.subtasks.length} مهام فرعية`);
    } catch (e) {
      logger.error('template create failed', e);
      toast.error('فشل إنشاء المهمة من القالب');
    } finally {
      setBusyId(null);
    }
  };

  const addCustom = () => {
    if (!name.trim()) {
      toast.error('اكتب اسم القالب');
      return;
    }
    setCustom(p => [...p, {
      id: `c${Date.now()}`, name: name.trim(), title: name.trim(),
      description: 'قالب مخصص', priority: 'MEDIUM', estimatedTime: 30,
      subtasks: [], tags: ['مخصص'], custom: true,
    }]);
    setName('');
    toast.success('تم حفظ القالب المخصص');
  };

  const all = [...BUILT_IN, ...custom];

  return (
    <div className="space-y-3">
      <h3 className="text-foreground text-base font-bold flex items-center gap-2">
        <LayoutTemplate className="h-5 w-5 text-violet-600 dark:text-violet-400" /> قوالب المهام الجاهزة
        <Badge variant="secondary">{all.length}</Badge>
      </h3>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="اسم قالب مخصص جديد..." value={name} onChange={e => setName(e.target.value)} />
          <Button size="sm" onClick={addCustom}><Plus className="h-4 w-4" /> حفظ</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {all.map(t => (
            <div key={t.id} className="py-3 border-b border-border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-foreground">{t.name}</p>
                {t.custom && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => setCustom(p => p.filter(x => x.id !== t.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-5 min-h-10">{t.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                <Badge variant="outline" className="text-[10px]">{t.estimatedTime} د</Badge>
                <Badge variant="outline" className="text-[10px]">{t.subtasks.length} فرعية</Badge>
              </div>
              <Button size="sm" variant="outline" className="w-full mt-2 h-8 text-xs" disabled={busyId === t.id} onClick={() => applyTemplate(t)}>
                <Copy className="h-3.5 w-3.5 ms-1" /> {busyId === t.id ? 'جارٍ الإنشاء...' : 'استخدام القالب'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
