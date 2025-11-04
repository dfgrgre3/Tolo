import { sendTemplatedNotification } from './notification-service';
import { getSafeAuthToken } from './safe-client-utils';

// دالة لفحص المهام القريبة الموعد وإرسال إشعارات
export async function checkUpcomingTasks() {
  try {
    const token = getSafeAuthToken();
    if (!token) return;

    // جلب المهام القريبة الموعد (خلال 24 ساعة القادمة)
    const response = await fetch('/api/tasks/upcoming', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    const tasks = await response.json();

    // إرسال إشعارات للمهام القريبة الموعد
    for (const task of tasks) {
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
    console.error('Error checking upcoming tasks:', error);
  }
}

// دالة لفحص الاختبارات القريبة وإرسال إشعارات
export async function checkUpcomingTests() {
  try {
    const token = getSafeAuthToken();
    if (!token) return;

    // جلب الاختبارات القريبة
    const response = await fetch('/api/tests/upcoming', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    const tests = await response.json();

    // إرسال إشعارات للاختبارات القريبة
    for (const test of tests) {
      const testDate = new Date(test.date);
      const now = new Date();
      const hoursUntilTest = (testDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // إرسال إشعار إذا كان الاختبار خلال 24 ساعة
      if (hoursUntilTest <= 24 && hoursUntilTest > 0) {
        const formattedTime = `${Math.floor(hoursUntilTest)} ساعة`;
        sendTemplatedNotification('testReminder', test.subject, formattedTime);
      }
    }
  } catch (error) {
    console.error('Error checking upcoming tests:', error);
  }
}

// دالة لفحص الجدول الدراسي وإرسال إشعارات
export async function checkSchedule() {
  try {
    const token = getSafeAuthToken();
    if (!token) return;

    // جلب الجدول الدراسي لليوم الحالي
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/schedule?date=${today}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    const schedule = await response.json();

    // إرسال إشعارات للحصص القريبة
    for (const item of schedule) {
      const classTime = new Date(`${today}T${item.startTime}`);
      const now = new Date();
      const hoursUntilClass = (classTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // إرسال إشعار إذا كانت الحصة خلال ساعة
      if (hoursUntilClass <= 1 && hoursUntilClass > 0) {
        const formattedTime = classTime.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        });
        sendTemplatedNotification('classReminder', item.subject, formattedTime);
      }
    }
  } catch (error) {
    console.error('Error checking schedule:', error);
  }
}

// دالة لفحص التقدم وإرسال إشعارات عند تحقيق إنجازات
export async function checkProgressMilestones() {
  try {
    const token = getSafeAuthToken();
    if (!token) return;

    // جلب بيانات التقدم
    const response = await fetch('/api/progress', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    const progress = await response.json();

    // إرسال إشعار عند تحقيق إنجاز (مثال: 7 أيام متتالية من الدراسة)
    if (progress.streakDays >= 7 && progress.streakDays % 7 === 0) {
      sendTemplatedNotification('progressMilestone', progress.streakDays);
    }

    // إرسال إشعار عند تحقيق هدف
    if (progress.recentGoals && progress.recentGoals.length > 0) {
      for (const goal of progress.recentGoals) {
        if (goal.achieved && !goal.notified) {
          sendTemplatedNotification('goalAchieved', goal.name);

          // تحديث الهدف لتمييزه بأنه تم إرسال إشعار له
          await fetch(`/api/goals/${goal.id}/notify`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking progress milestones:', error);
  }
}

// دالة لفحص المناسبات القريبة وإرسال إشعارات
export async function checkUpcomingEvents() {
  try {
    const token = getSafeAuthToken();
    if (!token) return;

    // جلب المناسبات القريبة
    const response = await fetch('/api/events/upcoming', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    const events = await response.json();

    // إرسال إشعارات للمناسبات القريبة
    for (const event of events) {
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
    console.error('Error checking upcoming events:', error);
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
export function scheduleNotificationChecks() {
  // تشغيل الفحوصص عند تحميل الصفحة
  runNotificationChecks();

  // تشغيل الفحوصص كل 30 دقيقة
  setInterval(runNotificationChecks, 30 * 60 * 1000);
}
