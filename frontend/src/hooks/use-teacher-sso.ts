"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-api";
import { apiRoutes } from "@/lib/api/routes";

interface Teacher {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  role: string;
  subjects: Array<{
    id: string;
    name: string;
  }>;
  isActive: boolean;
  lastLogin: string | null;
}

interface ImpersonationSession {
  id: string;
  originalUserId: string;
  targetUserId: string;
  targetUserRole: string;
  targetUserName: string;
  targetUserEmail: string;
  startedAt: string;
  expiresAt: string;
}

interface UseTeacherSSOOptions {
  onImpersonationStart?: (session: ImpersonationSession) => void;
  onImpersonationEnd?: () => void;
  redirectUrl?: string;
}

export function useTeacherSSO(options: UseTeacherSSOOptions = {}) {
  const { onImpersonationStart, onImpersonationEnd, redirectUrl = "/" } = options;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ImpersonationSession | null>(null);

  // Start impersonation as teacher
  const impersonateAsTeacher = useCallback(
    async (teacherId: string, teacher?: Teacher) => {
      if (!teacherId) {
        toast.error("معرف المعلم مطلوب");
        return false;
      }

      setIsLoading(true);

      try {
        const response = await adminFetch(apiRoutes.admin.impersonate, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            targetUserId: teacherId,
            targetRole: "TEACHER",
            reason: "admin_teacher_support",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "فشل في تسجيل الدخول كمعلم");
        }

        const data = await response.json();
        const session: ImpersonationSession = {
          id: data.sessionId || crypto.randomUUID(),
          originalUserId: data.originalUserId,
          targetUserId: teacherId,
          targetUserRole: "TEACHER",
          targetUserName: teacher?.name || data.targetUserName || "معلم",
          targetUserEmail: teacher?.email || data.targetUserEmail,
          startedAt: new Date().toISOString(),
          expiresAt: data.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        };

        // Store session info
        setActiveSession(session);
        localStorage.setItem("impersonation_session", JSON.stringify(session));

        toast.success(`تم تسجيل الدخول كـ ${session.targetUserName}`, {
          description: "سيتم توجيهك إلى لوحة المعلم",
        });

        onImpersonationStart?.(session);

        // Redirect to teacher dashboard or specified URL
        window.location.href = redirectUrl;

        return true;
      } catch (error: any) {
        toast.error(error.message || "فشل في تسجيل الدخول كمعلم");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [onImpersonationStart, redirectUrl]
  );

  // Start impersonation as student
  const impersonateAsStudent = useCallback(
    async (studentId: string, studentName?: string) => {
      if (!studentId) {
        toast.error("معرف الطالب مطلوب");
        return false;
      }

      setIsLoading(true);

      try {
        const response = await adminFetch(apiRoutes.admin.impersonate, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            targetUserId: studentId,
            targetRole: "STUDENT",
            reason: "admin_student_support",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "فشل في تسجيل الدخول كطالب");
        }

        const data = await response.json();
        const session: ImpersonationSession = {
          id: data.sessionId || crypto.randomUUID(),
          originalUserId: data.originalUserId,
          targetUserId: studentId,
          targetUserRole: "STUDENT",
          targetUserName: studentName || data.targetUserName || "طالب",
          targetUserEmail: data.targetUserEmail,
          startedAt: new Date().toISOString(),
          expiresAt: data.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        };

        setActiveSession(session);
        localStorage.setItem("impersonation_session", JSON.stringify(session));

        toast.success(`تم تسجيل الدخول كـ ${session.targetUserName}`, {
          description: "سيتم توجيهك إلى لوحة الطالب",
        });

        onImpersonationStart?.(session);

        window.location.href = redirectUrl;

        return true;
      } catch (error: any) {
        toast.error(error.message || "فشل في تسجيل الدخول كطالب");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [onImpersonationStart, redirectUrl]
  );

  // End impersonation and return to admin
  const endImpersonation = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await adminFetch(apiRoutes.admin.impersonate, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("فشل في إنهاء جلسة التجسس");
      }

      // Clear session
      setActiveSession(null);
      localStorage.removeItem("impersonation_session");

      toast.success("تم العودة إلى لوحة التحكم الإدارية");

      onImpersonationEnd?.();

      // Redirect back to admin
      window.location.href = "/admin";

      return true;
    } catch (error: any) {
      toast.error(error.message || "فشل في إنهاء الجلسة");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onImpersonationEnd]);

  // Load existing session on mount
  const restoreSession = useCallback(() => {
    if (typeof window === "undefined") return null;

    const saved = localStorage.getItem("impersonation_session");
    if (saved) {
      try {
        const session: ImpersonationSession = JSON.parse(saved);

        // Check if session is still valid
        if (new Date(session.expiresAt) > new Date()) {
          setActiveSession(session);
          return session;
        } else {
          localStorage.removeItem("impersonation_session");
        }
      } catch {
        localStorage.removeItem("impersonation_session");
      }
    }
    return null;
  }, []);

  // Check if currently impersonating
  const isImpersonating = activeSession !== null;
  const isImpersonatingTeacher = activeSession?.targetUserRole === "TEACHER";
  const isImpersonatingStudent = activeSession?.targetUserRole === "STUDENT";

  // Quick impersonation for common support scenarios
  const quickSupportLogin = useCallback(
    async (userId: string, userRole: "TEACHER" | "STUDENT", userName?: string) => {
      if (userRole === "TEACHER") {
        return impersonateAsTeacher(userId, { id: userId, name: userName } as Teacher);
      } else {
        return impersonateAsStudent(userId, userName);
      }
    },
    [impersonateAsTeacher, impersonateAsStudent]
  );

  return {
    // State
    isLoading,
    activeSession,
    isImpersonating,
    isImpersonatingTeacher,
    isImpersonatingStudent,

    // Actions
    impersonateAsTeacher,
    impersonateAsStudent,
    endImpersonation,
    quickSupportLogin,
    restoreSession,

    // Helpers
    impersonationInfo: activeSession
      ? {
          targetName: activeSession.targetUserName,
          targetEmail: activeSession.targetUserEmail,
          targetRole: activeSession.targetUserRole,
          startedAt: new Date(activeSession.startedAt).toLocaleString("ar-EG"),
          expiresAt: new Date(activeSession.expiresAt).toLocaleString("ar-EG"),
        }
      : null,
  };
}

// Hook for tracking impersonation activity
export function useImpersonationActivity(sessionId: string) {
  const [activity, setActivity] = useState<
    Array<{
      action: string;
      timestamp: string;
      details?: Record<string, unknown>;
    }>
  >([]);

  const logActivity = useCallback(
    (action: string, details?: Record<string, unknown>) => {
      setActivity((prev) => [
        ...prev,
        {
          action,
          timestamp: new Date().toISOString(),
          details,
        },
      ]);
    },
    []
  );

  return {
    activity,
    logActivity,
    activityCount: activity.length,
  };
}
