import { useState, useEffect, useCallback } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { safeFetch } from "@/lib/safe-client-utils";
import { errorService as errorManager } from '@/lib/logging/error-service';
import type { Schedule, SubjectEnrollment, Task, StudySession, Reminder, SubjectType } from '../types';

import { logger } from '@/lib/logger';

interface UseTimeDataReturn {
  isAuthenticated: boolean;
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

/**
 * Session-scoped time-management data. All endpoints resolve the user from
 * the JWT server-side, so no userId is ever sent — the queries simply wait
 * for an authenticated session.
 */
export function useTimeData(): UseTimeDataReturn {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Helper to process individual API call results
   * This reduces cognitive complexity of the main fetchData function
   */
  const processResult = useCallback(<T>(
    result: PromiseSettledResult<{ data: T | null; error: Error | null }>,
    path: string,
    setter: (data: T) => void,
    isArray = true
  ) => {
    if (result.status === 'rejected') {
      const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
      errorManager.handleNetworkError(error, path, { showToast: false });
      return;
    }

    const { data, error } = result.value;
    if (error) {
      errorManager.handleNetworkError(error, path, { showToast: false });
      return;
    }

    if (data === null) return;

    if (isArray && !Array.isArray(data)) {
      logger.warn(`${path} data is not an array:`, data);
      setter([] as unknown as T);
    } else {
      setter(data);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Use Promise.allSettled for better error handling - allows partial success
      const results = await Promise.allSettled([
        safeFetch<Schedule>('/api/schedule', undefined, null),
        safeFetch<SubjectEnrollment[]>('/api/subjects', undefined, []),
        safeFetch<Task[]>('/api/tasks', undefined, []),
        safeFetch<StudySession[]>('/api/study-sessions', undefined, []),
        safeFetch<Reminder[]>('/api/reminders', undefined, []),
      ]);

      const [scheduleRes, subjectsRes, tasksRes, sessionsRes, remindersRes] = results;

      // Process each result using the helper
      processResult(scheduleRes, '/api/schedule', setSchedule, false);
      processResult(subjectsRes, '/api/subjects', (data) => setSubjects(data.map(s => s.subject)));
      processResult(tasksRes, '/api/tasks', setTasks);
      processResult(sessionsRes, '/api/study-sessions', setStudySessions);
      processResult(remindersRes, '/api/reminders', setReminders);

      // Check for failures
      const failureCount = results.filter(r => r.status === 'rejected').length;
      if (failureCount === results.length) {
        errorManager.handleNetworkError(
          new Error("فشل في تحميل جميع البيانات"),
          "fetchData",
          {},
          {
            title: "خطأ في الاتصال",
            description: "فشل في تحميل البيانات. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى."
          }
        );
      } else if (failureCount > 0) {
        logger.warn(`Failed to load ${failureCount} out of ${results.length} data sources`);
      }
    } catch (error) {
      logger.error("Error fetching data:", error);
      const networkError = error instanceof Error ? error : new Error(String(error));
      errorManager.handleNetworkError(
        networkError,
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
  }, [user?.id, processResult]);

  useEffect(() => {
    if (!isAuthLoading) {
      queueMicrotask(() => {
        fetchData();
      });
    }
  }, [isAuthLoading, user?.id, fetchData]);

  return {
    isAuthenticated,
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
