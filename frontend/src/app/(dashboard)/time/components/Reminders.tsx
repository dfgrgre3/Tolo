'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell,
  Plus,
  Clock,
  CheckCircle,
  X,
  Search,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { differenceInMinutes, addMinutes, addDays } from 'date-fns';

import { logger } from '@/lib/logger';

import type { Reminder, ReminderFormData } from './_components/types';
import { QUICK_TIMES, SNOOZE_OPTIONS, getReminderTypeInfo, REMINDER_TYPES } from './_components/types';
import { Tag, BarChart3 } from './_components/icons';
import { ReminderFormDialog } from './_components/reminder-form-dialog';
import { RemindersList } from './_components/reminders-list';

interface RemindersProps {
  readonly initialReminders: Reminder[];
  readonly userId: string;
  readonly onReminderUpdate?: (reminder: Reminder) => void;
  readonly onReminderCreate?: (reminder: Reminder) => void;
  readonly onReminderDelete?: (reminderId: string) => void;
}

const FORM_DATA_INITIAL: ReminderFormData = {
  title: '',
  message: '',
  remindAt: '',
  type: 'CUSTOM',
  priority: 'MEDIUM',
  isRecurring: false,
  recurringPattern: 'DAILY',
  recurringInterval: 1,
  recurringDays: [],
  recurringEndDate: '',
  soundEnabled: true,
  notificationEnabled: true,
  tags: '',
  color: '#3b82f6',
  location: '',
  notes: ''
};

export default function Reminders({
  initialReminders,
  userId,
  onReminderUpdate,
  onReminderCreate,
  onReminderDelete
}: RemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState<Reminder | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'completed' | 'snoozed'>('all');
  const [sortBy, setSortBy] = useState<'remindAt' | 'created' | 'priority' | 'title' | 'type'>('remindAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCompleted] = useState(false);

  // Form states
  const [formData, setFormData] = useState<ReminderFormData>(FORM_DATA_INITIAL);

  // Advanced features
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [activeReminders, setActiveReminders] = useState<string[]>([]);

  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  const calculateStatsInternal = useCallback((remindersList: Reminder[]) => {
    const now = new Date();
    const total = remindersList.length;
    const upcoming = remindersList.filter(r => {
      const remindTime = new Date(r.remindAt);
      return remindTime > now && !r.isCompleted && !r.isSnoozed;
    }).length;
    const overdue = remindersList.filter(r => {
      const remindTime = new Date(r.remindAt);
      return remindTime < now && !r.isCompleted && !r.isSnoozed;
    }).length;
    const completed = remindersList.filter(r => r.isCompleted).length;
    const snoozed = remindersList.filter(r => r.isSnoozed).length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayReminders = remindersList.filter(r => {
      const remindDate = new Date(r.remindAt);
      return remindDate >= todayStart && remindDate <= todayEnd;
    }).length;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weekReminders = remindersList.filter(r => {
      const remindDate = new Date(r.remindAt);
      return remindDate >= weekStart && remindDate <= weekEnd;
    }).length;

    // Find most used type
    const typeCounts = remindersList.reduce((acc, reminder) => {
      const type = reminder.type || 'CUSTOM';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedType = Object.keys(typeCounts).length > 0
      ? Object.keys(typeCounts).reduce((a, b) =>
          (typeCounts[a] ?? 0) > (typeCounts[b] ?? 0) ? a : b, 'CUSTOM'
        )
      : 'CUSTOM';

    // Calculate average completion time
    const completedReminders = remindersList.filter(r => r.isCompleted && r.completedAt);
    const averageCompletionTime = completedReminders.length > 0
      ? completedReminders.reduce((acc, reminder) => {
          const created = new Date(reminder.createdAt || reminder.remindAt);
          const completed = new Date(reminder.completedAt || '');
          if (!Number.isNaN(created.getTime()) && !Number.isNaN(completed.getTime())) {
            return acc + differenceInMinutes(completed, created);
          }
          return acc;
        }, 0) / completedReminders.length
      : 0;

    return {
      total,
      upcoming,
      overdue,
      completed,
      snoozed,
      todayReminders,
      weekReminders,
      mostUsedType,
      averageCompletionTime: Math.round(averageCompletionTime)
    };
  }, []);

  const stats = useMemo(() => {
    return calculateStatsInternal(reminders);
  }, [reminders, calculateStatsInternal]);

  const showReminderNotification = useCallback((reminder: Reminder) => {
    if (!reminder) return;

    if (reminder.soundEnabled && Audio !== undefined) {
      logger.info('Playing notification sound');
    }

    if (reminder.notificationEnabled && notificationPermission === 'granted' && Notification !== undefined) {
      try {
        const notification = new Notification(reminder.title || 'تذكير', {
          body: reminder.message || 'حان وقت التذكير',
          icon: '/favicon.ico',
          tag: reminder.id,
          requireInteraction: false
        });

        notification.onclick = () => {
          if (globalThis.window !== undefined) {
            globalThis.window.focus();
          }
          notification.close();
        };

        setTimeout(() => {
          try {
            notification.close();
          } catch {
            // Ignore errors when closing
          }
        }, 10000);
      } catch (error) {
        logger.error('Failed to show notification', error);
      }
    }
  }, [notificationPermission]);

  useEffect(() => {
    if (globalThis.window !== undefined && 'Notification' in globalThis) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  useEffect(() => {
    const checkDueRemindersFn = () => {
      const now = new Date();
      const dueReminders = reminders.filter(reminder => {
        if (reminder.isCompleted || reminder.isSnoozed) return false;

        try {
          const remindTime = new Date(reminder.remindAt);
          if (Number.isNaN(remindTime.getTime())) return false;

          const timeDiff = differenceInMinutes(now, remindTime);
          return timeDiff >= 0 && timeDiff < 1;
        } catch {
          return false;
        }
      });

      for (const reminder of dueReminders) {
        showReminderNotification(reminder);
        setActiveReminders(prev => {
          if (!prev.includes(reminder.id)) {
            return [...prev, reminder.id];
          }
          return prev;
        });
      }
    };

    const interval = setInterval(checkDueRemindersFn, 60000);
    return () => clearInterval(interval);
  }, [reminders, showReminderNotification]);

  const matchesSearch = useCallback((reminder: Reminder): boolean => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return reminder.title.toLowerCase().includes(lowerQuery) ||
           (reminder.message?.toLowerCase().includes(lowerQuery) ?? false);
  }, [searchQuery]);

  const matchesStatusFilter = useCallback((reminder: Reminder, remindTime: Date): boolean => {
    const now = new Date();
    if (filter === 'upcoming') {
      return remindTime > now && !reminder.isCompleted && !reminder.isSnoozed;
    }
    if (filter === 'overdue') {
      return remindTime < now && !reminder.isCompleted && !reminder.isSnoozed;
    }
    if (filter === 'completed') {
      return reminder.isCompleted === true;
    }
    if (filter === 'snoozed') {
      return reminder.isSnoozed === true;
    }
    return true;
  }, [filter]);

  const matchesAllFilters = useCallback((reminder: Reminder): boolean => {
    const remindTime = new Date(reminder.remindAt);

    if (!matchesSearch(reminder)) return false;
    if (!matchesStatusFilter(reminder, remindTime)) return false;
    if (selectedType !== 'all' && reminder.type !== selectedType) return false;
    if (selectedPriority !== 'all' && reminder.priority !== selectedPriority) return false;
    if (selectedTags.length > 0 && !selectedTags.some(tag => reminder.tags?.includes(tag))) return false;
    if (!showCompleted && reminder.isCompleted) return false;

    return true;
  }, [matchesSearch, matchesStatusFilter, selectedType, selectedPriority, selectedTags, showCompleted]);

  const getSortComparison = useCallback((a: Reminder, b: Reminder): number => {
    switch (sortBy) {
      case 'remindAt':
        return new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime();
      case 'created': {
        const aTime = new Date(a.createdAt || '').getTime();
        const bTime = new Date(b.createdAt || '').getTime();
        return bTime - aTime;
      }
      case 'priority': {
        const priorityOrder: Record<string, number> = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const aPriority = priorityOrder[a.priority || 'MEDIUM'] || 2;
        const bPriority = priorityOrder[b.priority || 'MEDIUM'] || 2;
        return bPriority - aPriority;
      }
      case 'title':
        return a.title.localeCompare(b.title);
      case 'type': {
        const aType = a.type || 'CUSTOM';
        const bType = b.type || 'CUSTOM';
        return aType.localeCompare(bType);
      }
      default:
        return 0;
    }
  }, [sortBy]);

  const filteredReminders = useMemo(() => {
    const nextReminders = reminders.filter(matchesAllFilters);

    nextReminders.sort((a, b) => {
      const comparison = getSortComparison(a, b);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return nextReminders;
  }, [reminders, matchesAllFilters, getSortComparison, sortOrder]);

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title?.trim()) {
      logger.error('Title is required');
      return;
    }

    if (!formData.remindAt) {
      logger.error('Remind time is required');
      return;
    }

    const endpoint = reminderToEdit?.id ? `/api/reminders/${reminderToEdit.id}` : '/api/reminders';
    const method = reminderToEdit?.id ? 'PATCH' : 'POST';

    const tags = formData.tags
      ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : [];

    try {
      const remindAtDate = new Date(formData.remindAt);
      if (Number.isNaN(remindAtDate.getTime())) {
        throw new TypeError('Invalid date format');
      }

      const reminderData = {
        ...formData,
        userId,
        tags,
        remindAt: remindAtDate.toISOString()
      };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderData)
      });

      const text = await response.text();

      if (!response.ok) {
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          logger.error('Server returned HTML instead of JSON');
          throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        }
        throw new Error(`Failed to save reminder: ${response.status} ${response.statusText}`);
      }

      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        logger.error('Server returned HTML instead of JSON');
        throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
      }

      let savedReminder;
      try {
        savedReminder = JSON.parse(text);
      } catch (error) {
        logger.error('Error parsing JSON:', error);
        throw new Error('فشل في معالجة استجابة الخادم');
      }

      if (reminderToEdit) {
        setReminders(prev => prev.map(r => r.id === savedReminder.id ? savedReminder : r));
        onReminderUpdate?.(savedReminder);
      } else {
        setReminders(prev => [savedReminder, ...prev]);
        onReminderCreate?.(savedReminder);
      }

      setIsDialogOpen(false);
      setReminderToEdit(null);
      setFormData(FORM_DATA_INITIAL);
    } catch (error) {
      logger.error("Error saving reminder:", error);
    }
  }, [formData, reminderToEdit, userId, onReminderUpdate, onReminderCreate]);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setReminderToEdit(null);
    setFormData(FORM_DATA_INITIAL);
  }, []);

  const handleDelete = useCallback(async (reminderId: string) => {
    if (!reminderId) return;

    try {
      const response = await fetch(`/api/reminders/${reminderId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Failed to delete reminder: ${response.status}`);
      }

      setReminders(prev => prev.filter(r => r.id !== reminderId));
      onReminderDelete?.(reminderId);
    } catch (error) {
      logger.error("Error deleting reminder:", error);
    }
  }, [onReminderDelete]);

  const handleComplete = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCompleted: true,
          completedAt: new Date().toISOString()
        })
      });

      const text = await response.text();

      if (!response.ok) {
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          logger.error('Server returned HTML instead of JSON');
          throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        }
        throw new Error('Failed to complete reminder');
      }

      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        logger.error('Server returned HTML instead of JSON');
        throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
      }

      let updatedReminder;
      try {
        updatedReminder = JSON.parse(text);
      } catch (error) {
        logger.error('Error parsing JSON:', error);
        throw new Error('فشل في معالجة استجابة الخادم');
      }

      setReminders(prev => prev.map(r => r.id === reminderId ? updatedReminder : r));
      if (onReminderUpdate) onReminderUpdate(updatedReminder);

      setActiveReminders(prev => prev.filter(id => id !== reminderId));
    } catch (error) {
      logger.error("Error completing reminder:", error);
    }
  };

  const handleSnooze = async (reminderId: string, minutes: number) => {
    const snoozeUntil = addMinutes(new Date(), minutes);

    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSnoozed: true,
          snoozeUntil: snoozeUntil.toISOString()
        })
      });

      const text = await response.text();

      if (!response.ok) {
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          logger.error('Server returned HTML instead of JSON');
          throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        }
        throw new Error('Failed to snooze reminder');
      }

      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        logger.error('Server returned HTML instead of JSON');
        throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
      }

      let updatedReminder;
      try {
        updatedReminder = JSON.parse(text);
      } catch (error) {
        logger.error('Error parsing JSON:', error);
        throw new Error('فشل في معالجة استجابة الخادم');
      }

      setReminders(prev => prev.map(r => r.id === reminderId ? updatedReminder : r));
      if (onReminderUpdate) onReminderUpdate(updatedReminder);

      setActiveReminders(prev => prev.filter(id => id !== reminderId));
    } catch (error) {
      logger.error("Error snoozing reminder:", error);
    }
  };

  const handleQuickAdd = (minutes: number) => {
    const remindAt = addMinutes(new Date(), minutes);
    setFormData(prev => ({
      ...prev,
      remindAt: remindAt.toISOString().slice(0, 16)
    }));
    setIsDialogOpen(true);
  };

  const duplicateReminder = (reminder: Reminder) => {
    const newReminder = {
      ...reminder,
      id: `reminder_${Date.now()}`,
      title: `${reminder.title} (نسخة)`,
      remindAt: addDays(new Date(reminder.remindAt), 1).toISOString(),
      isCompleted: false,
      completedAt: undefined,
      isSnoozed: false,
      snoozeUntil: undefined
    };

    setReminders(prev => [newReminder, ...prev]);
    if (onReminderCreate) onReminderCreate(newReminder);
  };

  const getAllTags = useMemo(() => {
    const allTags = reminders.flatMap(reminder => reminder.tags || []);
    return [...new Set(allTags)];
  }, [reminders]);

  const handleEditReminder = useCallback((reminder: Reminder) => {
    setReminderToEdit(reminder);
    setFormData({
      title: reminder.title,
      message: reminder.message || '',
      remindAt: new Date(reminder.remindAt).toISOString().slice(0, 16),
      type: reminder.type || 'CUSTOM',
      priority: reminder.priority || 'MEDIUM',
      isRecurring: reminder.isRecurring || false,
      recurringPattern: reminder.recurringPattern || 'DAILY',
      recurringInterval: reminder.recurringInterval || 1,
      recurringDays: reminder.recurringDays || [],
      recurringEndDate: reminder.recurringEndDate || '',
      soundEnabled: reminder.soundEnabled !== false,
      notificationEnabled: reminder.notificationEnabled !== false,
      tags: reminder.tags?.join(', ') || '',
      color: reminder.color || '#3b82f6',
      location: reminder.location || '',
      notes: reminder.notes || ''
    });
    setIsDialogOpen(true);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedReminderIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">التذكيرات الذكية</h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>الإجمالي: {stats.total}</span>
            <span className="text-blue-600">قادمة: {stats.upcoming}</span>
            <span className="text-red-600">متأخرة: {stats.overdue}</span>
            <span className="text-green-600">مكتملة: {stats.completed}</span>
            {stats.snoozed > 0 && <span className="text-yellow-600">مؤجلة: {stats.snoozed}</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Quick Add Buttons */}
          <div className="flex gap-1">
            {QUICK_TIMES.slice(0, 3).map(quickTime => (
              <Button
                key={quickTime.minutes}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(quickTime.minutes)}
              >
                {quickTime.label}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkSelectMode(!bulkSelectMode)}
          >
            {bulkSelectMode ? <X className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                تذكير جديد
              </Button>
            </DialogTrigger>
            <ReminderFormDialog
              reminderToEdit={reminderToEdit}
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleFormSubmit}
              onCancel={handleDialogClose}
            />
          </Dialog>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              إحصائيات التذكيرات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.todayReminders}</div>
                <div className="text-sm text-gray-600">تذكيرات اليوم</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.weekReminders}</div>
                <div className="text-sm text-gray-600">تذكيرات الأسبوع</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {getReminderTypeInfo(stats.mostUsedType)!.label}
                </div>
                <div className="text-sm text-gray-600">النوع الأكثر استخداماً</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.averageCompletionTime}د</div>
                <div className="text-sm text-gray-600">متوسط وقت الإنجاز</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث في التذكيرات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filter} onValueChange={(value: typeof filter) => setFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التذكيرات</SelectItem>
                  <SelectItem value="upcoming">قادمة</SelectItem>
                  <SelectItem value="overdue">متأخرة</SelectItem>
                  <SelectItem value="completed">مكتملة</SelectItem>
                  <SelectItem value="snoozed">مؤجلة</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {REMINDER_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأولويات</SelectItem>
                  <SelectItem value="URGENT">عاجلة</SelectItem>
                  <SelectItem value="HIGH">مهمة</SelectItem>
                  <SelectItem value="MEDIUM">متوسطة</SelectItem>
                  <SelectItem value="LOW">منخفضة</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>

              <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remindAt">الوقت</SelectItem>
                  <SelectItem value="created">الإنشاء</SelectItem>
                  <SelectItem value="priority">الأولوية</SelectItem>
                  <SelectItem value="title">العنوان</SelectItem>
                  <SelectItem value="type">النوع</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags Filter */}
          {getAllTags.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 self-center">العلامات:</span>
                {getAllTags.map((tag: string) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (selectedTags.includes(tag)) {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Reminders Alert */}
      {activeReminders.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-600 animate-pulse" />
                <span className="font-medium text-red-800 dark:text-red-200">
                  لديك {activeReminders.length} تذكير نشط
                </span>
              </div>
              <div className="flex gap-2">
                {activeReminders.map(reminderId => {
                  const reminder = reminders.find(r => r.id === reminderId);
                  if (!reminder) return null;

                  return (
                    <div key={reminderId} className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleComplete(reminderId)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        إكمال
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Clock className="h-4 w-4 mr-1" />
                            تأجيل
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {SNOOZE_OPTIONS.map(option => (
                            <DropdownMenuItem
                              key={option.minutes}
                              onClick={() => handleSnooze(reminderId, option.minutes)}
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      <Card>
        <CardContent className="p-0">
          <RemindersList
            reminders={filteredReminders}
            bulkSelectMode={bulkSelectMode}
            selectedReminderIds={selectedReminderIds}
            emptyMessage={
              searchQuery || filter !== 'all' || selectedTags.length > 0
                ? 'لا توجد تذكيرات تطابق المرشحات المحددة'
                : 'اضغط على "تذكير جديد" لإنشاء تذكير'
            }
            onToggleSelect={handleToggleSelect}
            onComplete={handleComplete}
            onSnooze={handleSnooze}
            onEdit={handleEditReminder}
            onDuplicate={duplicateReminder}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
