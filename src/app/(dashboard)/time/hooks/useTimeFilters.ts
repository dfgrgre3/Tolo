import { useMemo } from 'react';
import type { Task, Reminder, StudySession } from '../types';

interface UseTimeFiltersProps {
  tasks: Task[];
  reminders: Reminder[];
  studySessions: StudySession[];
  taskSearch: string;
  taskFilter: "all" | "pending" | "in_progress" | "completed";
  reminderSearch: string;
  sessionFilter: "all" | "today" | "week" | "month";
  showUpcomingRemindersOnly: boolean;
}

export function useTimeFilters({
  tasks,
  reminders,
  studySessions,
  taskSearch,
  taskFilter,
  reminderSearch,
  sessionFilter,
  showUpcomingRemindersOnly
}: UseTimeFiltersProps) {
  const filteredTasks = useMemo(() => {
    if (!tasks.length) return [];
    
    const searchLower = taskSearch.toLowerCase();
    return tasks.filter(task => {
      const matchesSearch = !searchLower || 
                           task.title.toLowerCase().includes(searchLower) || 
                           (task.description?.toLowerCase().includes(searchLower) ?? false);
      
      const matchesFilter = taskFilter === "all" || task.status === taskFilter.toUpperCase();
      
      return matchesSearch && matchesFilter;
    });
  }, [tasks, taskSearch, taskFilter]);

  const filteredReminders = useMemo(() => {
    if (!reminders.length) return [];
    
    const searchLower = reminderSearch.toLowerCase();
    const now = new Date();
    
    return reminders.filter(reminder => {
      const matchesSearch = !searchLower ||
                           reminder.title.toLowerCase().includes(searchLower) ||
                           (reminder.message?.toLowerCase().includes(searchLower) ?? false);
      
      if (!matchesSearch) return false;
      
      if (!showUpcomingRemindersOnly) return true;
      
      const remindDate = new Date(reminder.remindAt);
      return remindDate > now;
    });
  }, [reminders, reminderSearch, showUpcomingRemindersOnly]);

  const filteredSessions = useMemo(() => {
    if (sessionFilter === "all" || !studySessions.length) {
      return studySessions;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let cutoffDate: Date;
    switch (sessionFilter) {
      case "today":
        cutoffDate = today;
        break;
      case "week":
        cutoffDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        cutoffDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        break;
      default:
        return studySessions;
    }
    
    return studySessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= cutoffDate;
    });
  }, [studySessions, sessionFilter]);

  return {
    filteredTasks,
    filteredReminders,
    filteredSessions
  };
}

