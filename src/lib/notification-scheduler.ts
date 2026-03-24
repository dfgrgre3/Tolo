import { sendTemplatedNotification } from '@/services/notification-service';
// تم إزالة نظام تسجيل الدخول

import { logger } from '@/lib/logger';

/**
 * Helper to safely fetch JSON data from APIs
 */
async function safeFetchJson(url: string, options: RequestInit = {}): Promise<any> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // Explicitly ask for JSON
        ...options.headers,
      },
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      logger.warn(`API responded with non-JSON content: ${url}`, {
        status: response.status,
        contentType,
        preview: text.substring(0, 100)
      });
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.debug(`API returned error status: ${url}`, {
        status: response.status,
        error: errorData
      });
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error(`Failed to fetch from ${url}:`, error);
    return null;
  }
}

// دالة لفحص المهام القريبة الموعد وإرسال إشعارات
export async function checkUpcomingTasks() {
  try {
    const result = await safeFetchJson('/api/tasks/upcoming');
    if (!result) return;
    const tasks = result.data?.tasks || result.tasks || [];

    if (!Array.isArray(tasks)) return;

    // إرسال إشعارات للمهام القريبة الموعد
    for (const task of tasks) {
      if (!task.dueAt) continue;
      
      const dueDate = new Date(task.dueAt);
      const now = new Date();
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // إرسال إشعار إذا كانت المهمة خلال 24 ساعة
      if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
        const formattedDate = dueDate.toLocaleDateString('ar-SA', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        sendTemplatedNotification('taskDueSoon', task.title, formattedDate);
      }

      // إرسال إشعار إذا كانت المهمة متأخرة
      if (hoursUntilDue <= 0) {
        const daysOverdue = Math.abs(Math.floor(hoursUntilDue / 24));
        sendTemplatedNotification('taskOverdue', task.title, daysOverdue);
      }
    }
  } catch (error) {
    logger.error('Error checking upcoming tasks:', error);
  }
}

// دالة لفحص الاختبارات القريبة وإرسال إشعارات
export async function checkUpcomingTests() {
  try {
    const result = await safeFetchJson('/api/tests/upcoming');
    if (!result) return;
    const tests = result.data?.tests || result.tests || [];

    if (!Array.isArray(tests)) return;

    // إرسال إشعارات للاختبارات القريبة
    for (const test of tests) {
      if (!test.date) continue;
      
      const testDate = new Date(test.date);
      const now = new Date();
      const hoursUntilTest = (testDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // إرسال إشعار إذا كان الاختبار خلال 24 ساعة
      if (hoursUntilTest <= 24 && hoursUntilTest > 0) {
        const formattedTime = `${Math.floor(hoursUntilTest)} ساعة`;
        sendTemplatedNotification('testReminder', test.subject || test.title, formattedTime);
      }
    }
  } catch (error) {
    logger.error('Error checking upcoming tests:', error);
  }
}

// دالة لفحص الجدول الدراسي وإرسال إشعارات
export async function checkSchedule() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await safeFetchJson(`/api/schedule?date=${today}`);
    if (!result) return;
    const scheduleData = result.data || result;
    
    if (!scheduleData || !scheduleData.planJson) return;
    
    let plan;
    try {
      plan = typeof scheduleData.planJson === 'string' ? JSON.parse(scheduleData.planJson) : scheduleData.planJson;
    } catch (e) {
      return;
    }
    
    const dayItems = plan[today] || [];
    if (!Array.isArray(dayItems)) return;

    // إرسال إشعارات للحصص القريبة
    for (const item of dayItems) {
      if (!item.startTime) continue;
      
      const classTime = new Date(`${today}T${item.startTime}`);
      const now = new Date();
      const hoursUntilClass = (classTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // إرسال إشعار إذا كانت الحصة خلال ساعة
      if (hoursUntilClass <= 1 && hoursUntilClass > 0) {
        const formattedTime = classTime.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        });
        sendTemplatedNotification('classReminder', item.subject || item.title, formattedTime);
      }
    }
  } catch (error) {
    logger.error('Error checking schedule:', error);
  }
}

// دالة لفحص التقدم وإرسال إشعارات عند تحقيق إنجازات
export async function checkProgressMilestones() {
  try {
    const result = await safeFetchJson('/api/progress');
    if (!result) return;
    const progress = result.data || result;

    if (!progress) return;

    // إرسال إشعار عند تحقيق إنجاز (مثال: 7 أيام متتالية من الدراسة)
    if (progress.streakDays >= 7 && progress.streakDays % 7 === 0) {
      sendTemplatedNotification('progressMilestone', progress.streakDays);
    }

    // إرسال إشعار عند تحقيق هدف
    if (progress.recentGoals && Array.isArray(progress.recentGoals) && progress.recentGoals.length > 0) {
      for (const goal of progress.recentGoals) {
        if (goal.achieved && !goal.notified) {
          sendTemplatedNotification('goalAchieved', goal.name || goal.title);

          // تحديث الهدف لتمييزه بأنه تم إرسال إشعار له
          await fetch(`/api/goals/${goal.id}/notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error checking progress milestones:', error);
  }
}

// دالة لفحص المناسبات القريبة وإرسال إشعارات
export async function checkUpcomingEvents() {
  try {
    const result = await safeFetchJson('/api/events/upcoming');
    if (!result) return;
    const events = result.data?.events || result.events || [];

    if (!Array.isArray(events)) return;

    // إرسال إشعارات للمناسبات القريبة
    for (const event of events) {
      if (!event.startDate) continue;
      
      const eventDate = new Date(event.startDate);
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // إرسال إشعار إذا كانت المناسبة خلال 24 ساعة
      if (hoursUntilEvent <= 24 && hoursUntilEvent > 0) {
        const formattedTime = `${Math.floor(hoursUntilEvent)} ساعة`;
        sendTemplatedNotification('eventReminder', event.title, formattedTime);
      }
    }
  } catch (error) {
    logger.error('Error checking upcoming events:', error);
  }
}

// دالة لفحص دورة حياة الاشتراكات (فترة السماح وانتهاء الصلاحية)
export async function checkSubscriptionLifecycle() {
  try {
    await safeFetchJson('/api/subscriptions/cron');
  } catch (error) {
    logger.error('Error checking subscription lifecycle:', error);
  }
}

// دالة لتشغيل جميع فحوصص الإشعارات
export async function runNotificationChecks() {
  await checkUpcomingTasks();
  await checkUpcomingTests();
  await checkSchedule();
  await checkProgressMilestones();
  await checkUpcomingEvents();
  await checkSubscriptionLifecycle(); // أتمتة دورة حياة الاشتراكات وفترات السماح
}

// دالة لجدولة الفحوصص لتعمل بشكل دوري
export function scheduleNotificationChecks(): () => void {
  // تشغيل الفحوصص عند تحميل الصفحة
  runNotificationChecks();

  // تشغيل الفحوصص كل دقيقتين بدلاً من 30 دقيقة لتجربة أفضل
  const interval = setInterval(runNotificationChecks, 2 * 60 * 1000);
  
  // Return cleanup function
  return () => {
    if (interval) {
      clearInterval(interval);
    }
  };
}

