
import { NotificationType } from '@/types/notification';
import { getTokenFromStorage } from '@/lib/auth-client';
import { logger } from '@/lib/logger';

// دالة لإرسال إشعار للمستخدم الحالي
export async function sendNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  options?: {
    actionUrl?: string;
    icon?: string;
  }
) {
  try {
    const token = getTokenFromStorage();
    if (!token) return;

    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        message,
        type,
        ...options,
      }),
    });

    if (!response.ok) {
      logger.error('Failed to send notification', undefined, { status: response.status });
    }
  } catch (error) {
    logger.error('Error sending notification', error);
  }
}

// دالة لإرسال إشعارات متعددة
export async function sendBulkNotifications(
  notifications: Array<{
    title: string;
    message: string;
    type: NotificationType;
    actionUrl?: string;
    icon?: string;
  }>
) {
  try {
    const token = getTokenFromStorage();
    if (!token) return;

    const response = await fetch('/api/notifications/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ notifications }),
    });

    if (!response.ok) {
      logger.error('Failed to send bulk notifications', undefined, { status: response.status });
    }
  } catch (error) {
    logger.error('Error sending bulk notifications', error);
  }
}

// دالة لإنشاء إشعارات تلقائية بناءً على الأحداث
export const notificationTemplates = {
  // إشعارات المهام
  taskDueSoon: (taskTitle: string, dueDate: string) => ({
    title: 'مهمة قريبة الموعد',
    message: `مهمة "${taskTitle}" سيتم تسليمها في ${dueDate}`,
    type: 'warning' as NotificationType,
    actionUrl: '/tasks',
    icon: '⏰',
  }),

  taskOverdue: (taskTitle: string, daysOverdue: number) => ({
    title: 'مهمة متأخرة',
    message: `مهمة "${taskTitle}" متأخرة منذ ${daysOverdue} يوم${daysOverdue > 1 ? 'أيام' : ''}`,
    type: 'error' as NotificationType,
    actionUrl: '/tasks',
    icon: '❌',
  }),

  taskCompleted: (taskTitle: string) => ({
    title: 'تم إكمال المهمة',
    message: `تم إكمال مهمة "${taskTitle}" بنجاح`,
    type: 'success' as NotificationType,
    actionUrl: '/tasks',
    icon: '✅',
  }),

  // إشعارات الاختبارات
  testGenerated: (subject: string) => ({
    title: 'تم إنشاء اختبار جديد',
    message: `تم إنشاء اختبار جديد في مادة ${subject}`,
    type: 'info' as NotificationType,
    actionUrl: '/test',
    icon: '📝',
  }),

  testCompleted: (subject: string, score: number) => ({
    title: 'نتيجة الاختبار',
    message: `لقد حصلت على ${score}% في اختبار ${subject}`,
    type: 'success' as NotificationType,
    actionUrl: '/test',
    icon: '🏆',
  }),

  testReminder: (subject: string, time: string) => ({
    title: 'تذكير بالاختبار',
    message: `لديك اختبار في ${subject} بعد ${time}`,
    type: 'warning' as NotificationType,
    actionUrl: '/test',
    icon: '⏰',
  }),

  // إشعارات الجدول الدراسي
  scheduleConflict: (time: string) => ({
    title: 'تعارض في الجدول',
    message: `يوجد تعارض في جدولك في ${time}`,
    type: 'warning' as NotificationType,
    actionUrl: '/schedule',
    icon: '📅',
  }),

  classReminder: (subject: string, time: string) => ({
    title: 'تذكير بالحصة',
    message: `لديك حصة ${subject} في ${time}`,
    type: 'info' as NotificationType,
    actionUrl: '/schedule',
    icon: '📚',
  }),

  // إشعارات التقدم
  progressMilestone: (streakDays: number) => ({
    title: 'إنجاز جديد',
    message: `لقد حققت ${streakDays} أيام متتالية من الدراسة!`,
    type: 'success' as NotificationType,
    actionUrl: '/progress',
    icon: '🔥',
  }),

  goalAchieved: (goalName: string) => ({
    title: 'تم تحقيق الهدف',
    message: `تهانينا! لقد حققت هدف "${goalName}"`,
    type: 'success' as NotificationType,
    actionUrl: '/progress',
    icon: '🎯',
  }),

  // إشعارات المجتمع
  newMessage: (senderName: string) => ({
    title: 'رسالة جديدة',
    message: `لديك رسالة جديدة من ${senderName}`,
    type: 'info' as NotificationType,
    actionUrl: '/chat',
    icon: '💬',
  }),

  eventReminder: (eventName: string, time: string) => ({
    title: 'تذكير بالمناسبة',
    message: `مناسبة "${eventName}" ستبدأ بعد ${time}`,
    type: 'info' as NotificationType,
    actionUrl: '/events',
    icon: '📅',
  }),

  newFollower: (followerName: string) => ({
    title: 'متابع جديد',
    message: `${followerName} يتابعك الآن`,
    type: 'info' as NotificationType,
    actionUrl: '/profile',
    icon: '👤',
  }),

  // إشعارات النظام
  systemUpdate: (version: string) => ({
    title: 'تحديث النظام',
    message: `تم تحديث النظام إلى الإصدار ${version}`,
    type: 'info' as NotificationType,
    icon: '🔄',
  }),

  securityAlert: (alertType: string) => ({
    title: 'تنبيه أمني',
    message: `تم اكتشاف نشاط غير معتاد: ${alertType}`,
    type: 'error' as NotificationType,
    actionUrl: '/settings',
    icon: '🔒',
  }),

  // إشعارات المحتوى
  newContent: (contentType: string, title: string) => ({
    title: `محتوى جديد: ${contentType}`,
    message: `تم إضافة ${title} حديثاً`,
    type: 'info' as NotificationType,
    actionUrl: '/resources',
    icon: '📚',
  }),

  contentRecommendation: (contentType: string, title: string) => ({
    title: 'توصية بالمحتوى',
    message: `قد يعجبك ${contentType}: ${title}`,
    type: 'info' as NotificationType,
    actionUrl: '/resources',
    icon: '👍',
  }),
};

// دالة لإرسال إشعار باستخدام القوالب
export function sendTemplatedNotification(
  templateKey: keyof typeof notificationTemplates,
  ...args: unknown[]
) {
  const template = notificationTemplates[templateKey];
  if (!template) return;

  // Type-safe dynamic function call
  const notification = (template as (...args: unknown[]) => ReturnType<typeof template>)(...args);
  return sendNotification(notification.title, notification.message, notification.type, {
    actionUrl: notification.actionUrl,
    icon: notification.icon,
  });
}
