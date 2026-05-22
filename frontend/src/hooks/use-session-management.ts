"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-api";

export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";
export type SessionStatus = "active" | "expired" | "revoked" | "suspended";

export interface DeviceInfo {
  id: string;
  deviceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  deviceName: string;
  deviceType: DeviceType;
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  status: SessionStatus;
  isCurrentDevice: boolean;
  userAgent: string;
}

export interface SessionStats {
  totalActive: number;
  totalExpired: number;
  uniqueDevices: number;
  uniqueLocations: number;
  suspiciousActivity: number;
}

export function useSessionManagement() {
  const queryClient = useQueryClient();

  // Fetch all active sessions
  const sessionsQuery = useQuery({
    queryKey: ["admin", "sessions"],
    queryFn: async () => {
      const response = await adminFetch("/admin/security/sessions");
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      return (data.data?.sessions || data.sessions || []) as DeviceInfo[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch session statistics
  const statsQuery = useQuery({
    queryKey: ["admin", "session-stats"],
    queryFn: async () => {
      const response = await adminFetch("/admin/security/sessions/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      return (data.data || data) as SessionStats;
    },
  });

  // Revoke a specific session
  const revokeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await adminFetch(`/admin/security/sessions/${sessionId}/revoke`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to revoke session");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إنهاء الجلسة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "session-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في إنهاء الجلسة");
    },
  });

  // Revoke all sessions except current
  const revokeOtherSessions = useMutation({
    mutationFn: async () => {
      const response = await adminFetch("/admin/security/sessions/revoke-others", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to revoke other sessions");
      return response.json();
    },
    onSuccess: (data) => {
      const count = data.data?.revokedCount || data.revokedCount || 0;
      toast.success(`تم إنهاء ${count} جلسة أخرى`);
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
    },
    onError: () => {
      toast.error("فشل في إنهاء الجلسات الأخرى");
    },
  });

  // Revoke all sessions for a user
  const revokeUserSessions = useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminFetch(`/admin/security/sessions/user/${userId}/revoke-all`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to revoke user sessions");
      return response.json();
    },
    onSuccess: (data) => {
      const count = data.data?.revokedCount || data.revokedCount || 0;
      toast.success(`تم إنهاء ${count} جلسة للمستخدم`);
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
    },
    onError: () => {
      toast.error("فشل في إنهاء جلسات المستخدم");
    },
  });

  // Suspend suspicious session
  const suspendSession = useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason: string }) => {
      const response = await adminFetch(`/admin/security/sessions/${sessionId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error("Failed to suspend session");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم تعليق الجلسة");
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
    },
    onError: () => {
      toast.error("فشل في تعليق الجلسة");
    },
  });

  // Get current device info
  const currentDevice = sessionsQuery.data?.find((s) => s.isCurrentDevice);

  // Group sessions by user
  const sessionsByUser = sessionsQuery.data?.reduce((acc, session) => {
    if (!acc[session.userId]) {
      acc[session.userId] = [];
    }
    acc[session.userId]!.push(session);
    return acc;
  }, {} as Record<string, DeviceInfo[]>);

  // Get active sessions count
  const activeSessionsCount = sessionsQuery.data?.filter((s) => s.status === "active").length || 0;

  return {
    // Data
    sessions: sessionsQuery.data || [],
    stats: statsQuery.data,
    currentDevice,
    sessionsByUser,
    activeSessionsCount,
    isLoading: sessionsQuery.isLoading || statsQuery.isLoading,

    // Actions
    revokeSession: revokeSession.mutate,
    isRevoking: revokeSession.isPending,

    revokeOtherSessions: revokeOtherSessions.mutate,
    isRevokingOthers: revokeOtherSessions.isPending,

    revokeUserSessions: revokeUserSessions.mutate,
    isRevokingUser: revokeUserSessions.isPending,

    suspendSession: suspendSession.mutate,
    isSuspending: suspendSession.isPending,

    refetch: () => {
      sessionsQuery.refetch();
      statsQuery.refetch();
    },
  };
}

// Hook for session activity monitoring
export function useSessionActivity() {
  const [activities, setActivities] = useState<
    Array<{
      id: string;
      sessionId: string;
      action: string;
      ipAddress: string;
      timestamp: string;
      risk: "low" | "medium" | "high";
    }>
  >([]);

  useEffect(() => {
    // In production, this would connect to a WebSocket for real-time updates
    // or poll an endpoint for recent activity
    const fetchRecentActivity = async () => {
      try {
        const response = await adminFetch("/admin/security/sessions/activity");
        if (response.ok) {
          const data = await response.json();
          setActivities(data.data?.activities || data.activities || []);
        }
      } catch {
        // Silently fail
      }
    };

    fetchRecentActivity();
    const interval = setInterval(fetchRecentActivity, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    activities,
    highRiskCount: activities.filter((a) => a.risk === "high").length,
  };
}

// Hook for user's own session management
export function useMySessions() {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["my-sessions"],
    queryFn: async () => {
      const response = await adminFetch("/security/my-sessions");
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      return (data.data?.sessions || data.sessions || []) as DeviceInfo[];
    },
  });

  const revokeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await adminFetch(`/security/my-sessions/${sessionId}/revoke`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to revoke session");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إنهاء الجلسة");
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
  });

  const revokeAllOthers = useMutation({
    mutationFn: async () => {
      const response = await adminFetch("/security/my-sessions/revoke-others", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to revoke sessions");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إنهاء جميع الجلسات الأخرى");
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
  });

  return {
    sessions: sessionsQuery.data || [],
    currentDevice: sessionsQuery.data?.find((s) => s.isCurrentDevice),
    isLoading: sessionsQuery.isLoading,
    revokeSession: revokeSession.mutate,
    revokeAllOthers: revokeAllOthers.mutate,
    refetch: sessionsQuery.refetch,
  };
}
