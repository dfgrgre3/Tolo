import { Target, Coffee, BookOpen, Users, Heart, Plus as PlusIcon, Zap, Moon, Star } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface Reminder {
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
  recurringDays?: number[];
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

export type ReminderFormData = {
  title: string;
  message: string;
  remindAt: string;
  type: NonNullable<Reminder['type']>;
  priority: NonNullable<Reminder['priority']>;
  isRecurring: boolean;
  recurringPattern: NonNullable<Reminder['recurringPattern']>;
  recurringInterval: number;
  recurringDays: number[];
  recurringEndDate: string;
  soundEnabled: boolean;
  notificationEnabled: boolean;
  tags: string;
  color: string;
  location: string;
  notes: string;
};

export const QUICK_TIMES = [
  { label: 'خلال 5 دقائق', minutes: 5 },
  { label: 'خلال 15 دقيقة', minutes: 15 },
  { label: 'خلال 30 دقيقة', minutes: 30 },
  { label: 'خلال ساعة', minutes: 60 },
  { label: 'خلال ساعتين', minutes: 120 },
  { label: 'غداً', minutes: 24 * 60 },
  { label: 'الأسبوع القادم', minutes: 7 * 24 * 60 }
];

export const SNOOZE_OPTIONS = [
  { label: '5 دقائق', minutes: 5 },
  { label: '10 دقائق', minutes: 10 },
  { label: '15 دقيقة', minutes: 15 },
  { label: '30 دقيقة', minutes: 30 },
  { label: 'ساعة', minutes: 60 },
  { label: 'غداً', minutes: 24 * 60 }
];

export const REMINDER_TYPES = [
  { value: 'TASK', label: 'مهمة', icon: Target, color: 'bg-blue-500' },
  { value: 'BREAK', label: 'استراحة', icon: Coffee, color: 'bg-green-500' },
  { value: 'STUDY', label: 'دراسة', icon: BookOpen, color: 'bg-purple-500' },
  { value: 'MEETING', label: 'اجتماع', icon: Users, color: 'bg-orange-500' },
  { value: 'PERSONAL', label: 'شخصي', icon: Heart, color: 'bg-pink-500' },
  { value: 'MEDICINE', label: 'دواء', icon: PlusIcon, color: 'bg-red-500' },
  { value: 'EXERCISE', label: 'رياضة', icon: Zap, color: 'bg-yellow-500' },
  { value: 'MEAL', label: 'وجبة', icon: Coffee, color: 'bg-amber-500' },
  { value: 'SLEEP', label: 'نوم', icon: Moon, color: 'bg-indigo-500' },
  { value: 'CUSTOM', label: 'مخصص', icon: Star, color: 'bg-gray-500' }
] as const;

export const getReminderTypeInfo = (type?: string) => {
  return REMINDER_TYPES.find(t => t.value === type) || REMINDER_TYPES.at(-1) || REMINDER_TYPES[0];
};

export const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'URGENT': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    case 'HIGH': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    case 'LOW': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
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

export const getTimeInfo = (remindAt: string) => {
  const remindTime = new Date(remindAt);

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
