'use client';

import dynamic from 'next/dynamic';
import { ComponentErrorBoundary } from '@/components/ui/error-boundary';
import type { Task } from '../types';

const RecurringTasks = dynamic(() => import('./RecurringTasks'), { ssr: false });
const TaskTemplates = dynamic(() => import('./TaskTemplates'), { ssr: false });

interface Props {
  subjects: string[];
  onTaskCreate: (task: Task) => void;
}

export default function TaskTools({ subjects, onTaskCreate }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start" dir="rtl">
      <ComponentErrorBoundary>
        <RecurringTasks subjects={subjects} onTaskCreate={onTaskCreate} />
      </ComponentErrorBoundary>
      <ComponentErrorBoundary>
        <TaskTemplates onTaskCreate={onTaskCreate} />
      </ComponentErrorBoundary>
    </div>
  );
}
