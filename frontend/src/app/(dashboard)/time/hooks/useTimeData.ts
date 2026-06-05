import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from "@/lib/safe-client-utils";
import { errorService as errorManager } from '@/lib/logging/error-service';
import { useAuth } from "@/contexts/auth-context";
import { useTimeTrackerStore } from '@/hooks/use-time-tracker-store';
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
  const globalStoreSetUserId = useTimeTrackerStore((state) => state.setUserId);

  // Sync userId with AuthContext and fallback to guest ID
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
      globalStoreSetUserId(user.id);
    } else if (!isAuthLoading) {
      // Fallback to guest ID if not logged in
      import("@/lib/user-utils").then(({ ensureUser }) => {
        ensureUser().then(id => {
          if (id) {
            setUserId(id);
            globalStoreSetUserId(id);
          }
        });
      });
    }
  }, [user, isAuthLoading, globalStoreSetUserId]);

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
    const apiPath = `${path}?userId=${userId}`;

    if (result.status === 'rejected') {
      const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
      errorManager.handleNetworkError(error, apiPath, { showToast: false });
      return;
    }

    const { data, error } = result.value;
    if (error) {
      errorManager.handleNetworkError(error, apiPath, { showToast: false });
      return;
    }

    if (data === null) return;

    if (isArray && !Array.isArray(data)) {
      logger.warn(`${path} data is not an array:`, data);
      setter([] as unknown as T);
    } else {
      setter(data);
    }
  }, [userId]);

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
  }, [userId, processResult]);

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
