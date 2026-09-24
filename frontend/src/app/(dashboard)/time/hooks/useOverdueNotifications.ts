import { useEffect, useCallback, useRef } from 'react';
import type { Task } from '../types';
import { isPast, differenceInHours } from 'date-fns';

interface UseOverdueNotificationsProps {
  tasks: Task[];
  onNotification?: (message: string, type: 'warning' | 'error') => void;
  checkInterval?: number; // in milliseconds
}

export function useOverdueNotifications({
  tasks,
  onNotification,
  checkInterval = 60000 // Check every minute
}: UseOverdueNotificationsProps) {
  /** Signature of the last notified situation — avoids re-firing identical toasts. */
  const lastNotifiedRef = useRef<string>('initial');
  const checkOverdueTasks = useCallback(() => {
    const now = new Date();
    const overdueTasks = tasks.filter(task => 
      task.dueAt && 
      task.status !== 'COMPLETED' && 
      isPast(new Date(task.dueAt))
    );

    const urgentTasks = overdueTasks.filter(task => {
      const hoursOverdue = differenceInHours(now, new Date(task.dueAt!));
      return hoursOverdue > 24 || task.priority === 'URGENT';
    });

    const upcomingDeadlines = tasks.filter(task =>
      task.dueAt &&
      task.status !== 'COMPLETED' &&
      !isPast(new Date(task.dueAt)) &&
      differenceInHours(new Date(task.dueAt), now) <= 3
    );

    // Dedup: the 60s interval would otherwise re-fire the SAME message on every
    // tick. Only notify when the situation's signature (kind + count) changes.
    const signature =
      urgentTasks.length > 0
        ? `urgent:${urgentTasks.length}`
        : upcomingDeadlines.length > 0
          ? `upcoming:${upcomingDeadlines.length}`
          : 'clear';
    if (signature === lastNotifiedRef.current) return;
    lastNotifiedRef.current = signature;

    if (urgentTasks.length > 0 && onNotification) {
      onNotification(
        `لديك ${urgentTasks.length} مهمة متأخرة تحتاج إلى انتباه فوري`,
        'error'
      );
    } else if (upcomingDeadlines.length > 0 && onNotification) {
      onNotification(
        `${upcomingDeadlines.length} مهمة قريبة من الموعد النهائي`,
        'warning'
      );
    }
  }, [tasks, onNotification]);

  useEffect(() => {
    // Check immediately
    checkOverdueTasks();

    // Set up interval for periodic checks
    const interval = setInterval(checkOverdueTasks, checkInterval);

    return () => {
      clearInterval(interval);
    };
  }, [checkOverdueTasks, checkInterval]);
}

