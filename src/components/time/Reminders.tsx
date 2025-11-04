'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Button } from "@/shared/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/shared/badge";
import { 
  Bell,
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Copy,
  Archive,
  Volume2,
  VolumeX,
  Repeat,
  Target,
  BookOpen,
  Coffee,
  Brain,
  Users,
  Home,
  Briefcase,
  Heart,
  Star,
  Zap,
  Moon,
  Sun,
  Timer,
  Settings,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff,
  Download,
  Upload,
  Share2,
  RefreshCw,
  MoreHorizontal,
  Play,
  Pause,
  Square,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast, isThisWeek, differenceInMinutes, addMinutes, addHours, addDays, addWeeks, addMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Reminder {
  id: string;
  userId: string;
  title: string;
  message?: string;
  remindAt: string;
  type?: 'TASK' | 'BREAK' | 'STUDY' | 'MEETING' | 'PERSONAL' | 'MEDICINE' | 'EXERCISE' | 'MEAL' | 'SLEEP' | 'CUSTOM';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRecurring?: boolean;
  recurringPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  recurringInterval?: number;
  recurringDays?: number[]; // for weekly recurring
  recurringEndDate?: string;
  isCompleted?: boolean;
  completedAt?: string;
  isSnoozed?: boolean;
  snoozeUntil?: string;
  soundEnabled?: boolean;
  notificationEnabled?: boolean;
  tags?: string[];
  color?: string;
  location?: string;
  attachments?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RemindersProps {
  initialReminders: Reminder[];
  userId: string;
  onReminderUpdate?: (reminder: Reminder) => void;
  onReminderCreate?: (reminder: Reminder) => void;
  onReminderDelete?: (reminderId: string) => void;
}

const REMINDER_TYPES = [
  { value: 'TASK', label: 'مهمة', icon: Target, color: 'bg-blue-500' },
  { value: 'BREAK', label: 'استراحة', icon: Coffee, color: 'bg-green-500' },
  { value: 'STUDY', label: 'دراسة', icon: BookOpen, color: 'bg-purple-500' },
  { value: 'MEETING', label: 'اجتماع', icon: Users, color: 'bg-orange-500' },
  { value: 'PERSONAL', label: 'شخصي', icon: Heart, color: 'bg-pink-500' },
  { value: 'MEDICINE', label: 'دواء', icon: Plus, color: 'bg-red-500' },
  { value: 'EXERCISE', label: 'رياضة', icon: Zap, color: 'bg-yellow-500' },
  { value: 'MEAL', label: 'وجبة', icon: Coffee, color: 'bg-amber-500' },
  { value: 'SLEEP', label: 'نوم', icon: Moon, color: 'bg-indigo-500' },
  { value: 'CUSTOM', label: 'مخصص', icon: Star, color: 'bg-gray-500' }
];

const QUICK_TIMES = [
  { label: 'خلال 5 دقائق', minutes: 5 },
  { label: 'خلال 15 دقيقة', minutes: 15 },
  { label: 'خلال 30 دقيقة', minutes: 30 },
  { label: 'خلال ساعة', minutes: 60 },
  { label: 'خلال ساعتين', minutes: 120 },
  { label: 'غداً', minutes: 24 * 60 },
  { label: 'الأسبوع القادم', minutes: 7 * 24 * 60 }
];

const SNOOZE_OPTIONS = [
  { label: '5 دقائق', minutes: 5 },
  { label: '10 دقائق', minutes: 10 },
  { label: '15 دقيقة', minutes: 15 },
  { label: '30 دقيقة', minutes: 30 },
  { label: 'ساعة', minutes: 60 },
  { label: 'غداً', minutes: 24 * 60 }
];

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
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    remindAt: '',
    type: 'CUSTOM' as Reminder['type'],
    priority: 'MEDIUM' as Reminder['priority'],
    isRecurring: false,
    recurringPattern: 'DAILY' as Reminder['recurringPattern'],
    recurringInterval: 1,
    recurringDays: [] as number[],
    recurringEndDate: '',
    soundEnabled: true,
    notificationEnabled: true,
    tags: '',
    color: '#3b82f6',
    location: '',
    notes: ''
  });
  
  // Advanced features
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [activeReminders, setActiveReminders] = useState<string[]>([]);
  
  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    overdue: 0,
    completed: 0,
    snoozed: 0,
    todayReminders: 0,
    weekReminders: 0,
    mostUsedType: '',
    averageCompletionTime: 0
  });

  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  // Memoize stats calculation
  const statsMemo = useMemo(() => {
    return calculateStatsInternal(reminders);
  }, [reminders]);

  useEffect(() => {
    setStats(statsMemo);
  }, [statsMemo]);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
    
    // Check for due reminders every minute
    const interval = setInterval(checkDueReminders, 60000);
    return () => clearInterval(interval);
  }, [checkDueReminders]);

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
          typeCounts[a] > typeCounts[b] ? a : b, 'CUSTOM'
        )
      : 'CUSTOM';
    
    // Calculate average completion time
    const completedReminders = remindersList.filter(r => r.isCompleted && r.completedAt);
    const averageCompletionTime = completedReminders.length > 0
      ? completedReminders.reduce((acc, reminder) => {
          const created = new Date(reminder.createdAt || reminder.remindAt);
          const completed = new Date(reminder.completedAt || '');
          if (!isNaN(created.getTime()) && !isNaN(completed.getTime())) {
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

  const checkDueReminders = useCallback(() => {
    const now = new Date();
    const dueReminders = reminders.filter(reminder => {
      if (reminder.isCompleted || reminder.isSnoozed) return false;
      
      try {
        const remindTime = new Date(reminder.remindAt);
        if (isNaN(remindTime.getTime())) return false;
        
        const timeDiff = differenceInMinutes(now, remindTime);
        // Check if reminder is due (within 1 minute)
        return timeDiff >= 0 && timeDiff < 1;
      } catch {
        return false;
      }
    });
    
    dueReminders.forEach(reminder => {
      showReminderNotification(reminder);
      setActiveReminders(prev => {
        if (!prev.includes(reminder.id)) {
          return [...prev, reminder.id];
        }
        return prev;
      });
    });
  }, [reminders]);

  const showReminderNotification = useCallback((reminder: Reminder) => {
    if (!reminder) return;
    
    // Play sound if enabled
    if (reminder.soundEnabled && 'Audio' in window) {
      // You would play a notification sound here
      console.log('Playing notification sound');
    }
    
    // Show browser notification
    if (reminder.notificationEnabled && notificationPermission === 'granted') {
      try {
        const notification = new Notification(reminder.title || 'تذكير', {
          body: reminder.message || 'حان وقت التذكير',
          icon: '/favicon.ico',
          tag: reminder.id,
          requireInteraction: false
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
        // Auto close after 10 seconds
        setTimeout(() => {
          try {
            notification.close();
          } catch {
            // Ignore errors when closing
          }
        }, 10000);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  }, [notificationPermission]);

  const getFilteredAndSortedReminders = () => {
    let filteredReminders = reminders.filter(reminder => {
      const now = new Date();
      const remindTime = new Date(reminder.remindAt);
      
      // Text search
      if (searchQuery && !reminder.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !reminder.message?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (filter === 'upcoming' && (remindTime <= now || reminder.isCompleted || reminder.isSnoozed)) return false;
      if (filter === 'overdue' && (remindTime >= now || reminder.isCompleted || reminder.isSnoozed)) return false;
      if (filter === 'completed' && !reminder.isCompleted) return false;
      if (filter === 'snoozed' && !reminder.isSnoozed) return false;
      
      // Type filter
      if (selectedType !== 'all' && reminder.type !== selectedType) return false;
      
      // Priority filter
      if (selectedPriority !== 'all' && reminder.priority !== selectedPriority) return false;
      
      // Tags filter
      if (selectedTags.length > 0 && !selectedTags.some(tag => reminder.tags?.includes(tag))) return false;
      
      // Show completed filter
      if (!showCompleted && reminder.isCompleted) return false;
      
      return true;
    });

    // Sort reminders
    filteredReminders.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'remindAt':
          comparison = new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime();
          break;
        case 'created':
          comparison = new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
          break;
        case 'priority':
          const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          comparison = (priorityOrder[b.priority || 'MEDIUM'] || 2) - (priorityOrder[a.priority || 'MEDIUM'] || 2);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = (a.type || 'CUSTOM').localeCompare(b.type || 'CUSTOM');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filteredReminders;
  };

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      console.error('Title is required');
      return;
    }

    if (!formData.remindAt) {
      console.error('Remind time is required');
      return;
    }

    const endpoint = reminderToEdit?.id ? `/api/reminders/${reminderToEdit.id}` : '/api/reminders';
    const method = reminderToEdit?.id ? 'PATCH' : 'POST';
    
    // Process tags
    const tags = formData.tags 
      ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : [];
    
    try {
      const remindAtDate = new Date(formData.remindAt);
      if (isNaN(remindAtDate.getTime())) {
        throw new Error('Invalid date format');
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
      
      // Read response text first to check if it's HTML
      const text = await response.text();
      
      if (!response.ok) {
        // Check if response is HTML (error page)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error('Server returned HTML instead of JSON');
          throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        }
        throw new Error(`Failed to save reminder: ${response.status} ${response.statusText}`);
      }
      
      // Check if response is HTML (error page)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error('Server returned HTML instead of JSON');
        throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
      }

      // Try to parse as JSON
      let savedReminder;
      try {
        savedReminder = JSON.parse(text);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        throw new Error('فشل في معالجة استجابة الخادم');
      }
      
      if (reminderToEdit) {
        setReminders(prev => prev.map(r => r.id === savedReminder.id ? savedReminder : r));
        onReminderUpdate?.(savedReminder);
      } else {
        setReminders(prev => [savedReminder, ...prev]);
        onReminderCreate?.(savedReminder);
      }
      
      handleDialogClose();
    } catch (error) {
      console.error("Error saving reminder:", error);
      // You can add toast notification here if needed
    }
  }, [formData, reminderToEdit, userId, onReminderUpdate, onReminderCreate, handleDialogClose]);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setReminderToEdit(null);
    setFormData({
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
    });
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
      console.error("Error deleting reminder:", error);
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
      
      // Read response text first to check if it's HTML
      const text = await response.text();
      
      if (!response.ok) {
        // Check if response is HTML (error page)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error('Server returned HTML instead of JSON');
          throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        }
        throw new Error('Failed to complete reminder');
      }
      
      // Check if response is HTML (error page)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error('Server returned HTML instead of JSON');
        throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
      }

      // Try to parse as JSON
      let updatedReminder;
      try {
        updatedReminder = JSON.parse(text);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        throw new Error('فشل في معالجة استجابة الخادم');
      }
      
      setReminders(prev => prev.map(r => r.id === reminderId ? updatedReminder : r));
      if (onReminderUpdate) onReminderUpdate(updatedReminder);
      
      // Remove from active reminders
      setActiveReminders(prev => prev.filter(id => id !== reminderId));
    } catch (error) {
      console.error("Error completing reminder:", error);
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
      
      // Read response text first to check if it's HTML
      const text = await response.text();
      
      if (!response.ok) {
        // Check if response is HTML (error page)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error('Server returned HTML instead of JSON');
          throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        }
        throw new Error('Failed to snooze reminder');
      }
      
      // Check if response is HTML (error page)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error('Server returned HTML instead of JSON');
        throw new Error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
      }

      // Try to parse as JSON
      let updatedReminder;
      try {
        updatedReminder = JSON.parse(text);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        throw new Error('فشل في معالجة استجابة الخادم');
      }
      
      setReminders(prev => prev.map(r => r.id === reminderId ? updatedReminder : r));
      if (onReminderUpdate) onReminderUpdate(updatedReminder);
      
      // Remove from active reminders
      setActiveReminders(prev => prev.filter(id => id !== reminderId));
    } catch (error) {
      console.error("Error snoozing reminder:", error);
    }
  };

  const handleQuickAdd = (minutes: number) => {
    const remindAt = addMinutes(new Date(), minutes);
    setFormData(prev => ({
      ...prev,
      remindAt: remindAt.toISOString().slice(0, 16) // Format for datetime-local input
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

  const getReminderTypeInfo = (type?: string) => {
    return REMINDER_TYPES.find(t => t.value === type) || REMINDER_TYPES[REMINDER_TYPES.length - 1];
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'HIGH': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'LOW': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getPriorityText = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return 'عاجل';
      case 'HIGH': return 'مهم';
      case 'MEDIUM': return 'متوسط';
      case 'LOW': return 'منخفض';
      default: return 'متوسط';
    }
  };

  const getTimeInfo = (remindAt: string) => {
    const remindTime = new Date(remindAt);
    const now = new Date();
    
    if (isPast(remindTime)) {
      return { text: 'متأخر', color: 'text-red-600', urgent: true };
    } else if (isToday(remindTime)) {
      return { text: 'اليوم', color: 'text-orange-600', urgent: true };
    } else if (isTomorrow(remindTime)) {
      return { text: 'غداً', color: 'text-yellow-600', urgent: false };
    } else if (isThisWeek(remindTime)) {
      return { text: 'هذا الأسبوع', color: 'text-blue-600', urgent: false };
    } else {
      return { text: format(remindTime, 'dd/MM/yyyy', { locale: ar }), color: 'text-gray-600', urgent: false };
    }
  };

  const filteredReminders = getFilteredAndSortedReminders();

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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {reminderToEdit ? 'تعديل التذكير' : 'تذكير جديد'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">العنوان *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="عنوان التذكير"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">النوع</label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">الرسالة</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="رسالة التذكير"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">وقت التذكير *</label>
                    <Input
                      type="datetime-local"
                      value={formData.remindAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, remindAt: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">الأولوية</label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">منخفضة</SelectItem>
                        <SelectItem value="MEDIUM">متوسطة</SelectItem>
                        <SelectItem value="HIGH">مهمة</SelectItem>
                        <SelectItem value="URGENT">عاجلة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">الموقع</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="موقع التذكير"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">اللون</label>
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">العلامات</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="علامة1, علامة2, علامة3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">ملاحظات</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="ملاحظات إضافية"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                      />
                      <span className="text-sm">تذكير متكرر</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.soundEnabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      />
                      <span className="text-sm">صوت</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.notificationEnabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, notificationEnabled: e.target.checked }))}
                      />
                      <span className="text-sm">إشعار</span>
                    </label>
                  </div>
                  
                  {formData.isRecurring && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-1">النمط</label>
                        <Select 
                          value={formData.recurringPattern} 
                          onValueChange={(value: any) => setFormData(prev => ({ ...prev, recurringPattern: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAILY">يومي</SelectItem>
                            <SelectItem value="WEEKLY">أسبوعي</SelectItem>
                            <SelectItem value="MONTHLY">شهري</SelectItem>
                            <SelectItem value="YEARLY">سنوي</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">الفترة</label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.recurringInterval}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurringInterval: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">تاريخ الانتهاء</label>
                        <Input
                          type="date"
                          value={formData.recurringEndDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    إلغاء
                  </Button>
                  <Button type="submit">
                    {reminderToEdit ? 'تحديث' : 'إنشاء'}
                  </Button>
                </div>
              </form>
            </DialogContent>
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
                  {getReminderTypeInfo(stats.mostUsedType).label}
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
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
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
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
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
          {getAllTags().length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 self-center">العلامات:</span>
                {getAllTags().map(tag => (
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
          <div className="space-y-0">
            {filteredReminders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p className="text-lg font-medium mb-2">لا توجد تذكيرات</p>
                <p className="text-sm">
                  {searchQuery || filter !== 'all' || selectedTags.length > 0
                    ? 'لا توجد تذكيرات تطابق المرشحات المحددة'
                    : 'اضغط على "تذكير جديد" لإنشاء تذكير'}
                </p>
              </div>
            ) : (
              filteredReminders.map((reminder, index) => {
                const typeInfo = getReminderTypeInfo(reminder.type);
                const timeInfo = getTimeInfo(reminder.remindAt);
                const Icon = typeInfo.icon;
                
                return (
                  <div 
                    key={reminder.id} 
                    className={cn(
                      "border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                      reminder.isCompleted && 'bg-green-50 dark:bg-green-900/10',
                      reminder.isSnoozed && 'bg-yellow-50 dark:bg-yellow-900/10',
                      timeInfo.urgent && !reminder.isCompleted && !reminder.isSnoozed && 'bg-red-50 dark:bg-red-900/10',
                      bulkSelectMode && selectedReminderIds.includes(reminder.id) && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Bulk Select Checkbox */}
                        {bulkSelectMode && (
                          <input
                            type="checkbox"
                            checked={selectedReminderIds.includes(reminder.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReminderIds([...selectedReminderIds, reminder.id]);
                              } else {
                                setSelectedReminderIds(selectedReminderIds.filter(id => id !== reminder.id));
                              }
                            }}
                            className="mt-1"
                            aria-label={`تحديد تذكير ${reminder.title}`}
                          />
                        )}
                        
                        {/* Type Icon */}
                        <div 
                          className={cn("p-2 rounded shrink-0", typeInfo.color)}
                          style={{ backgroundColor: reminder.color }}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        
                        {/* Reminder Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={cn(
                                  "font-medium text-lg",
                                  reminder.isCompleted && "line-through text-gray-500"
                                )}>
                                  {reminder.title}
                                </h3>
                                
                                {reminder.isRecurring && (
                                  <Repeat className="h-4 w-4 text-blue-500" />
                                )}
                              </div>
                              
                              {reminder.message && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                  {reminder.message}
                                </p>
                              )}
                              
                              {/* Reminder Meta Info */}
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {typeInfo.label}
                                </Badge>
                                
                                <Badge className={cn("text-xs", getPriorityColor(reminder.priority))}>
                                  {getPriorityText(reminder.priority)}
                                </Badge>
                                
                                <Badge 
                                  variant={timeInfo.urgent ? "destructive" : "outline"} 
                                  className="text-xs"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(new Date(reminder.remindAt), 'dd/MM HH:mm', { locale: ar })}
                                </Badge>
                                
                                <Badge variant="outline" className={cn("text-xs", timeInfo.color)}>
                                  {timeInfo.text}
                                </Badge>
                                
                                {reminder.location && (
                                  <Badge variant="outline" className="text-xs">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {reminder.location}
                                  </Badge>
                                )}
                                
                                {reminder.isCompleted && (
                                  <Badge variant="default" className="text-xs bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    مكتمل
                                  </Badge>
                                )}
                                
                                {reminder.isSnoozed && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    مؤجل
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Tags */}
                              {reminder.tags && reminder.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {reminder.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {/* Notes */}
                              {reminder.notes && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                  "{reminder.notes}"
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                              {!reminder.isCompleted && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleComplete(reminder.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {!reminder.isCompleted && timeInfo.urgent && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Clock className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    {SNOOZE_OPTIONS.map(option => (
                                      <DropdownMenuItem
                                        key={option.minutes}
                                        onClick={() => handleSnooze(reminder.id, option.minutes)}
                                      >
                                        {option.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
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
                                  }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    تعديل
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem onClick={() => duplicateReminder(reminder)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    نسخ
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleDelete(reminder.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add missing components
function Tag({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BarChart3({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}