'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import type { Task } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  tasks: Task[];
  onStatusChange: (taskId: string, status: Task['status']) => void;
}

const COLUMNS: { id: NonNullable<Task['status']>; title: string; color: string }[] = [
  { id: 'PENDING', title: 'في الانتظار', color: 'border-amber-500/30' },
  { id: 'IN_PROGRESS', title: 'قيد التنفيذ', color: 'border-blue-500/30' },
  { id: 'COMPLETED', title: 'مكتملة', color: 'border-orange-500/30' },
  { id: 'CANCELLED', title: 'ملغاة', color: 'border-slate-500/30' },
];

const ORDER: NonNullable<Task['status']>[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const priorityColor: Record<string, string> = {
  URGENT: 'bg-red-500/20 text-red-300 border-red-500/30',
  HIGH: 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/30',
  MEDIUM: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  LOW: 'bg-slate-500/20 text-muted-foreground border-slate-500/30',
};

export default function TaskKanban({ tasks, onStatusChange }: Props) {
  const move = (task: Task, dir: 1 | -1) => {
    const idx = ORDER.indexOf(task.status ?? 'PENDING');
    const next = ORDER[idx + dir];
    if (next) onStatusChange(task.id, next);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" dir="rtl">
      {COLUMNS.map(col => {
        const items = tasks.filter(t => (t.status ?? 'PENDING') === col.id);
        const totalMin = items.reduce((a, t) => a + (t.estimatedTime ?? 0), 0);
        return (
          <div key={col.id} className={cn('border-t-2 pt-3', col.color)}>
            <div className="pb-2">
              <h3 className="text-sm text-foreground font-bold flex items-center justify-between">
                {col.title}
                <Badge variant="secondary">{items.length}</Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">≈ {totalMin} دقيقة مقدرة</p>
            </div>
            <div className="space-y-2 max-h-[560px] overflow-y-auto">
              {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">لا توجد مهام</p>}
              {items.map(t => (
                <div key={t.id} className="py-3 border-b border-border">
                  <p className="text-sm font-bold text-foreground leading-6">{t.title}</p>
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.priority && <Badge variant="outline" className={cn('text-[10px]', priorityColor[t.priority])}>{t.priority}</Badge>}
                    {t.dueAt && (
                      <Badge variant="outline" className="text-[10px]">
                        {new Date(t.dueAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                      </Badge>
                    )}
                    {t.estimatedTime ? <Badge variant="outline" className="text-[10px]">{t.estimatedTime} د</Badge> : null}
                  </div>
                  {(t.subtasks?.length ?? 0) > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t.subtasks!.filter(s => s.isCompleted).length}/{t.subtasks!.length} مهام فرعية
                    </p>
                  )}
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={col.id === 'PENDING'} onClick={() => move(t, -1)}>
                      <ArrowRight className="h-3 w-3" /> رجوع
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={col.id === 'CANCELLED'} onClick={() => move(t, 1)}>
                      تقديم <ArrowLeft className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
