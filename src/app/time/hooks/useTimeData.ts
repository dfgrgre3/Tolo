import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from "@/lib/safe-client-utils";
import errorManager from "@/services/ErrorManager";
import { ensureUser } from "@/lib/user-utils";
import type { Schedule, SubjectEnrollment, Task, StudySession, Reminder, SubjectType } from '../types';

interface UseTimeDataReturn {
  userId: string | null;
  schedule: Schedule | null;
  subjects: SubjectType[];
  tasks: Task[];
  studySessions: StudySession[];
  reminders: Reminder[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

export function useTimeData(): UseTimeDataReturn {
  const [userId, setUserId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId || userId.trim() === '' || userId === 'undefined') {
      console.warn('Invalid userId, skipping data fetch');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const [
        { data: scheduleData, error: scheduleError },
        { data: subjectsData, error: subjectsError },
        { data: tasksData, error: tasksError },
        { data: studySessionsData, error: studySessionsError },
        { data: remindersData, error: remindersError }
      ] = await Promise.all([
        safeFetch<Schedule>(`/api/schedule?userId=${encodeURIComponent(userId)}`, undefined, null),
        safeFetch<SubjectEnrollment[]>(`/api/subjects?userId=${encodeURIComponent(userId)}`, undefined, []),
        safeFetch<Task[]>(`/api/tasks`, undefined, []),
        safeFetch<StudySession[]>(`/api/study-sessions`, undefined, []),
        safeFetch<Reminder[]>(`/api/reminders?userId=${encodeURIComponent(userId)}`, undefined, []),
      ]);

      if (scheduleError) {
        errorManager.handleNetworkError(scheduleError, `/api/schedule?userId=${userId}`, {
          showToast: false
        });
      } else if (scheduleData) {
        setSchedule(scheduleData);
      }
      
      if (subjectsError) {
        errorManager.handleNetworkError(subjectsError, `/api/subjects?userId=${userId}`, {
          showToast: false
        });
      } else if (subjectsData) {
        setSubjects(subjectsData.map(s => s.subject));
      }
      
      if (tasksError) {
        errorManager.handleNetworkError(tasksError, `/api/tasks?userId=${userId}`, {
          showToast: false
        });
      } else if (tasksData) {
        setTasks(tasksData);
      }
      
      if (studySessionsError) {
        errorManager.handleNetworkError(studySessionsError, `/api/study-sessions?userId=${userId}`, {
          showToast: false
        });
      } else if (studySessionsData) {
        setStudySessions(studySessionsData);
      }
      
      if (remindersError) {
        errorManager.handleNetworkError(remindersError, `/api/reminders?userId=${userId}`, {
          showToast: false
        });
      } else if (remindersData) {
        setReminders(remindersData);
      }

      const criticalErrors = [scheduleError, tasksError, studySessionsError].filter(Boolean);
      if (criticalErrors.length > 0) {
        errorManager.handleNetworkError(
          new Error("فشل في تحميل بعض البيانات"),
          "fetchData",
          {},
          {
            title: "خطأ في الاتصال",
            description: "حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى."
          }
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      errorManager.handleNetworkError(
        error instanceof Error ? error : new Error(String(error)),
        "fetchData",
        {},
        {
          title: "خطأ في الاتصال",
          description: "حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى."
        }
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    (async () => {
      try {
        const id = await ensureUser();
        if (id && id.trim() !== '' && id !== 'undefined') {
          setUserId(id);
        } else {
          console.warn('Failed to get valid userId');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error ensuring user:', error);
        setIsLoading(false);
      }
    })();
  }, []);

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
    fetchData
  };
}

