import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from "@/lib/safe-client-utils";
import { errorService as errorManager } from '@/lib/logging/error-service';
import { useAuth } from "@/contexts/auth-context";
import type { Schedule, SubjectEnrollment, Task, StudySession, Reminder, SubjectType } from '../types';

import { logger } from '@/lib/logger';

interface UseTimeDataReturn {
  userId: string | null;
  schedule: Schedule | null;
  subjects: SubjectType[];
  tasks: Task[];
  studySessions: StudySession[];
  reminders: Reminder[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  setStudySessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  setSchedule: React.Dispatch<React.SetStateAction<Schedule | null>>;
}

export function useTimeData(): UseTimeDataReturn {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync userId with AuthContext and fallback to guest ID
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    } else if (!isAuthLoading) {
      // Fallback to guest ID if not logged in
      import("@/lib/user-utils").then(({ ensureUser }) => {
        ensureUser().then(id => {
          if (id) setUserId(id);
        });
      });
    }
  }, [user, isAuthLoading]);

  const fetchData = useCallback(async () => {
    if (!userId || userId.trim() === '' || userId === 'undefined') {
      logger.warn('Invalid userId, skipping data fetch');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Use Promise.allSettled for better error handling - allows partial success
      const results = await Promise.allSettled([
        safeFetch<Schedule>(`/api/schedule?userId=${encodeURIComponent(userId)}`, undefined, null),
        safeFetch<SubjectEnrollment[]>(`/api/subjects?userId=${encodeURIComponent(userId)}`, undefined, []),
        safeFetch<Task[]>(`/api/tasks?userId=${encodeURIComponent(userId)}`, undefined, []),
        safeFetch<StudySession[]>(`/api/study-sessions?userId=${encodeURIComponent(userId)}`, undefined, []),
        safeFetch<Reminder[]>(`/api/reminders?userId=${encodeURIComponent(userId)}`, undefined, []),
      ]);

      // Process schedule
      const scheduleResult = results[0];
      if (scheduleResult.status === 'fulfilled') {
        const { data: scheduleData, error: scheduleError } = scheduleResult.value;
        if (scheduleError) {
          errorManager.handleNetworkError(scheduleError, `/api/schedule?userId=${userId}`, {
            showToast: false
          });
        } else if (scheduleData) {
          setSchedule(scheduleData);
        }
      } else {
        errorManager.handleNetworkError(
          scheduleResult.reason instanceof Error ? scheduleResult.reason : new Error(String(scheduleResult.reason)),
          `/api/schedule?userId=${userId}`,
          { showToast: false }
        );
      }

      // Process subjects
      const subjectsResult = results[1];
      if (subjectsResult.status === 'fulfilled') {
        const { data: subjectsData, error: subjectsError } = subjectsResult.value;
        if (subjectsError) {
          errorManager.handleNetworkError(subjectsError, `/api/subjects?userId=${userId}`, {
            showToast: false
          });
        } else if (Array.isArray(subjectsData)) {
          setSubjects(subjectsData.map(s => s.subject));
        } else {
          logger.warn('Subjects data is not an array:', subjectsData);
          setSubjects([]);
        }
      } else {
        errorManager.handleNetworkError(
          subjectsResult.reason instanceof Error ? subjectsResult.reason : new Error(String(subjectsResult.reason)),
          `/api/subjects?userId=${userId}`,
          { showToast: false }
        );
      }

      // Process tasks
      const tasksResult = results[2];
      if (tasksResult.status === 'fulfilled') {
        const { data: tasksData, error: tasksError } = tasksResult.value;
        if (tasksError) {
          errorManager.handleNetworkError(tasksError, `/api/tasks?userId=${userId}`, {
            showToast: false
          });
        } else if (Array.isArray(tasksData)) {
          setTasks(tasksData);
        } else {
          logger.warn('Tasks data is not an array:', tasksData);
          setTasks([]);
        }
      } else {
        errorManager.handleNetworkError(
          tasksResult.reason instanceof Error ? tasksResult.reason : new Error(String(tasksResult.reason)),
          `/api/tasks?userId=${userId}`,
          { showToast: false }
        );
      }

      // Process study sessions
      const sessionsResult = results[3];
      if (sessionsResult.status === 'fulfilled') {
        const { data: studySessionsData, error: studySessionsError } = sessionsResult.value;
        if (studySessionsError) {
          errorManager.handleNetworkError(studySessionsError, `/api/study-sessions?userId=${userId}`, {
            showToast: false
          });
        } else if (Array.isArray(studySessionsData)) {
          setStudySessions(studySessionsData);
        } else {
          logger.warn('Study sessions data is not an array:', studySessionsData);
          setStudySessions([]);
        }
      } else {
        errorManager.handleNetworkError(
          sessionsResult.reason instanceof Error ? sessionsResult.reason : new Error(String(sessionsResult.reason)),
          `/api/study-sessions?userId=${userId}`,
          { showToast: false }
        );
      }

      // Process reminders
      const remindersResult = results[4];
      if (remindersResult.status === 'fulfilled') {
        const { data: remindersData, error: remindersError } = remindersResult.value;
        if (remindersError) {
          errorManager.handleNetworkError(remindersError, `/api/reminders?userId=${userId}`, {
            showToast: false
          });
        } else if (Array.isArray(remindersData)) {
          setReminders(remindersData);
        } else {
          logger.warn('Reminders data is not an array:', remindersData);
          setReminders([]);
        }
      } else {
        errorManager.handleNetworkError(
          remindersResult.reason instanceof Error ? remindersResult.reason : new Error(String(remindersResult.reason)),
          `/api/reminders?userId=${userId}`,
          { showToast: false }
        );
      }

      // Check for critical failures
      const criticalFailures = results.filter(r => r.status === 'rejected');
      if (criticalFailures.length === results.length) {
        errorManager.handleNetworkError(
          new Error("فشل في تحميل جميع البيانات"),
          "fetchData",
          {},
          {
            title: "خطأ في الاتصال",
            description: "فشل في تحميل البيانات. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى."
          }
        );
      } else if (criticalFailures.length > 0) {
        // Partial failure - show warning but continue
        logger.warn(`Failed to load ${criticalFailures.length} out of ${results.length} data sources`);
      }
    } catch (error) {
      logger.error("Error fetching data:", error);
      errorManager.handleNetworkError(
        error instanceof Error ? error : new Error(String(error)),
        "fetchData",
        {},
        {
          title: "خطأ في الاتصال",
          description: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو تحديث الصفحة."
        }
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  return {
    userId,
    schedule,
    subjects,
    tasks,
    studySessions,
    reminders,
    isLoading,
    fetchData,
    setTasks,
    setReminders,
    setStudySessions,
    setSchedule
  };
}
