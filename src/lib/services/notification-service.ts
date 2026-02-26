
import { NotificationType } from '@/types/notification';
// Token is in httpOnly cookie - no need to import getTokenFromStorage
import { logger } from '@/lib/logger';

/**
 * Send notification to current user
 * Improved with better error handling, validation, and timeout protection
 */
export async function sendNotification(
  title: string,
  message: string,
  type: NotificationType = 'info',
  options?: {
    actionUrl?: string;
    icon?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  // Validate inputs early
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    logger.error('Invalid notification title');
    return { success: false, error: 'Title is required' };
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    logger.error('Invalid notification message');
    return { success: false, error: 'Message is required' };
  }

  if (title.trim().length > 200) {
    logger.error('Notification title too long');
    return { success: false, error: 'Title is too long' };
  }

  if (message.trim().length > 1000) {
    logger.error('Notification message too long');
    return { success: false, error: 'Message is too long' };
  }

  try {
    // Token is in httpOnly cookie - no need to send Authorization header
    const fetchPromise = fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        title: title.trim(),
        message: message.trim(),
        type,
        ...options,
      }),
    });

    const timeoutPromise = new Promise<Response>((resolve, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Failed to send notification', undefined, {
        status: response.status,
        error: errorData.error || 'Unknown error'
      });
      return { success: false, error: errorData.error || 'Failed to send notification' };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error sending notification', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send multiple notifications at once
 * Improved with better error handling, validation, and timeout protection
 */
export async function sendBulkNotifications(
  notifications: Array<{
    title: string;
    message: string;
    type: NotificationType;
    actionUrl?: string;
    icon?: string;
  }>
): Promise<{ success: boolean; error?: string; sent?: number; failed?: number }> {
  // Validate inputs early
  if (!notifications || !Array.isArray(notifications)) {
    logger.error('Invalid notifications array');
    return { success: false, error: 'Notifications must be an array' };
  }

  if (notifications.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  if (notifications.length > 100) {
    logger.error('Too many notifications in bulk request');
    return { success: false, error: 'Maximum 100 notifications per bulk request' };
  }

  // Validate each notification
  const invalidNotifications = notifications.filter(
    (notif, index) =>
      !notif.title ||
      typeof notif.title !== 'string' ||
      notif.title.trim().length === 0 ||
      !notif.message ||
      typeof notif.message !== 'string' ||
      notif.message.trim().length === 0
  );

  if (invalidNotifications.length > 0) {
    logger.error('Invalid notifications found in bulk request');
    return { success: false, error: `${invalidNotifications.length} notification(s) have invalid title or message` };
  }

  try {
    // Token is in httpOnly cookie - no need to send Authorization header
    const fetchPromise = fetch('/api/notifications/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        notifications: notifications.map(notif => ({
          title: notif.title.trim(),
          message: notif.message.trim(),
          type: notif.type,
          actionUrl: notif.actionUrl?.trim(),
          icon: notif.icon?.trim(),
        }))
      }),
    });

    const timeoutPromise = new Promise<Response>((resolve, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout for bulk
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Failed to send bulk notifications', undefined, {
        status: response.status,
        error: errorData.error || 'Unknown error'
      });
      return { success: false, error: errorData.error || 'Failed to send bulk notifications' };
    }

    const result = await response.json().catch(() => ({}));
    return {
      success: true,
      sent: result.sent || notifications.length,
      failed: result.failed || 0
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error sending bulk notifications', error);
    return { success: false, error: errorMessage };
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

// Whitelist of allowed template keys for security
const ALLOWED_TEMPLATE_KEYS: ReadonlySet<keyof typeof notificationTemplates> = new Set([
  'taskDueSoon',
  'taskOverdue',
  'taskCompleted',
  'testGenerated',
  'testCompleted',
  'testReminder',
  'scheduleConflict',
  'classReminder',
  'progressMilestone',
  'goalAchieved',
  'newMessage',
  'eventReminder',
  'newFollower',
  'systemUpdate',
  'securityAlert',
  'newContent',
  'contentRecommendation',
] as const);

// دالة لإرسال إشعار باستخدام القوالب
export function sendTemplatedNotification(
  templateKey: keyof typeof notificationTemplates,
  ...args: unknown[]
) {
  // Security: Validate templateKey against whitelist before accessing object
  if (!ALLOWED_TEMPLATE_KEYS.has(templateKey)) {
    logger.error('Invalid template key attempted', undefined, { templateKey });
    return Promise.resolve({ success: false, error: 'Invalid template key' });
  }

  const template = notificationTemplates[templateKey];
  if (!template) {
    logger.error('Template not found', undefined, { templateKey });
    return Promise.resolve({ success: false, error: 'Template not found' });
  }

  // Type-safe dynamic function call
  const notification = (template as (...args: unknown[]) => ReturnType<typeof template>)(...args);

  // Safely extract optional properties
  const options: { actionUrl?: string; icon?: string } = {};
  if ('actionUrl' in notification && notification.actionUrl) {
    options.actionUrl = notification.actionUrl;
  }
  if ('icon' in notification && notification.icon) {
    options.icon = notification.icon;
  }

  return sendNotification(notification.title, notification.message, notification.type, options);
}

export const notificationService = {
  sendNotification,
  sendBulkNotifications,
  sendTemplatedNotification,
  notificationTemplates,
};
