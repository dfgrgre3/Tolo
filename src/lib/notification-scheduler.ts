import { sendTemplatedNotification } from '@/services/notification-service';
// تم إزالة نظام تسجيل الدخول

import { logger } from '@/lib/logger';

// دالة لفحص المهام القريبة الموعد وإرسال إشعارات
export async function checkUpcomingTasks() {
  try {
    // Token is in httpOnly cookie - no need to send Authorization header
    // جلب المهام القريبة الموعد (خلال 24 ساعة القادمة)
    const response = await fetch('/api/tasks/upcoming', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
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
    // Token is in httpOnly cookie - no need to send Authorization header
    // جلب الاختبارات القريبة
    const response = await fetch('/api/tests/upcoming', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
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
    // Token is in httpOnly cookie - no need to send Authorization header
    // جلب الجدول الدراسي لليوم الحالي
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/schedule?date=${today}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
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
    // Token is in httpOnly cookie - no need to send Authorization header
    // جلب بيانات التقدم
    const response = await fetch('/api/progress', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
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
          // Token is in httpOnly cookie - no need to send Authorization header
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
    // Token is in httpOnly cookie - no need to send Authorization header
    // جلب المناسبات القريبة
    const response = await fetch('/api/events/upcoming', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
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

// دالة لتشغيل جميع فحوصص الإشعارات
export async function runNotificationChecks() {
  await checkUpcomingTasks();
  await checkUpcomingTests();
  await checkSchedule();
  await checkProgressMilestones();
  await checkUpcomingEvents();
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

