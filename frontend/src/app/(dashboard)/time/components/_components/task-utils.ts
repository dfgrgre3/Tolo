import { isToday, isTomorrow, isThisWeek, isPast, differenceInDays } from 'date-fns';
import type { Task } from './task-types';

export const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'URGENT': return 'bg-red-500';
    case 'HIGH': return 'bg-orange-500';
    case 'MEDIUM': return 'bg-yellow-500';
    case 'LOW': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export const getPriorityText = (priority?: string) => {
  switch (priority) {
    case 'URGENT': return 'عاجل';
    case 'HIGH': return 'مهم';
    case 'MEDIUM': return 'متوسط';
    case 'LOW': return 'منخفض';
    default: return 'متوسط';
  }
};

export const getStatusColor = (status?: string) => {
  switch (status) {
    case 'COMPLETED': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    case 'CANCELLED': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
  }
};

export const getStatusText = (status?: string) => {
  switch (status) {
    case 'COMPLETED': return 'مكتملة';
    case 'IN_PROGRESS': return 'قيد التنفيذ';
    case 'CANCELLED': return 'ملغية';
    default: return 'في الانتظار';
  }
};

export const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const getDueDateInfo = (dueAt?: string) => {
  if (!dueAt) return null;

  const dueDate = new Date(dueAt);
  const now = new Date();

  if (isPast(dueDate)) {
    return { text: 'متأخر', color: 'text-red-600', urgent: true };
  } else if (isToday(dueDate)) {
    return { text: 'اليوم', color: 'text-orange-600', urgent: true };
  } else if (isTomorrow(dueDate)) {
    return { text: 'غداً', color: 'text-yellow-600', urgent: false };
  } else if (isThisWeek(dueDate)) {
    return { text: 'هذا الأسبوع', color: 'text-blue-600', urgent: false };
  } else {
    const days = differenceInDays(dueDate, now);
    return { text: `خلال ${days} يوم`, color: 'text-gray-600', urgent: false };
  }
};

export const matchesTaskSearch = (task: Task, searchQuery: string): boolean => {
  if (!searchQuery) return true;
  const lowerQuery = searchQuery.toLowerCase();
  return task.title.toLowerCase().includes(lowerQuery) ||
         (task.description?.toLowerCase().includes(lowerQuery) ?? false);
};

export const matchesTaskStatusFilter = (task: Task, filter: string): boolean => {
  if (filter === 'pending') return task.status === 'PENDING';
  if (filter === 'in_progress') return task.status === 'IN_PROGRESS';
  if (filter === 'completed') return task.status === 'COMPLETED';
  if (filter === 'overdue') {
    return task.dueAt !== undefined &&
           isPast(new Date(task.dueAt)) &&
           task.status !== 'COMPLETED';
  }
  return true;
};

export const matchesTaskFilters = (
  task: Task,
  searchQuery: string,
  filter: string,
  selectedSubject: string,
  selectedPriority: string,
  selectedTags: string[],
  showCompleted: boolean
): boolean => {
  if (!matchesTaskSearch(task, searchQuery)) return false;
  if (!matchesTaskStatusFilter(task, filter)) return false;
  if (selectedSubject !== 'all' && task.subject !== selectedSubject) return false;
  if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
  if (selectedTags.length > 0 && !selectedTags.some(tag => task.tags?.includes(tag))) return false;
  if (!showCompleted && task.status === 'COMPLETED') return false;
  return true;
};

export const getTaskSortComparison = (a: Task, b: Task, sortBy: string): number => {
  switch (sortBy) {
    case 'dueDate': {
      const aTime = a.dueAt ? new Date(a.dueAt).getTime() : null;
      const bTime = b.dueAt ? new Date(b.dueAt).getTime() : null;

      if (aTime === null && bTime === null) return 0;
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return aTime - bTime;
    }
    case 'created': {
      const aTime = new Date(a.createdAt || '').getTime();
      const bTime = new Date(b.createdAt || '').getTime();
      return bTime - aTime;
    }
    case 'priority': {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const aPriority = priorityOrder[a.priority || 'MEDIUM'] || 2;
      const bPriority = priorityOrder[b.priority || 'MEDIUM'] || 2;
      return bPriority - aPriority;
    }
    case 'title':
      return a.title.localeCompare(b.title);
    case 'status': {
      const statusOrder = { 'PENDING': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3, 'CANCELLED': 4 };
      const aStatus = statusOrder[a.status || 'PENDING'] || 1;
      const bStatus = statusOrder[b.status || 'PENDING'] || 1;
      return aStatus - bStatus;
    }
    default:
      return 0;
  }
};
