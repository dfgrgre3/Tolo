"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type { DeviceInfo } from "./use-admin-sessions";

interface RawSession {
  id: string;
  userId: string;
  ip?: string;
  browser?: string;
  os?: string;
  country?: string;
  lastActive?: string;
  createdAt?: string;
  expiresAt: string;
  isActive: boolean;
}

/** The signed-in user's own session list (account settings / security page). */
export function useMySessions() {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["my-sessions"],
    queryFn: async () => {
      const data = await apiClient.get<RawSession[]>(apiRoutes.auth.sessions);
      return data.map((s): DeviceInfo => ({
        id: s.id,
        deviceId: s.id,
        userId: s.userId,
        userName: "",
        userEmail: "",
        deviceName: "",
        deviceType: "unknown",
        ipAddress: s.ip || "127.0.0.1",
        browser: s.browser || "Unknown Browser",
        os: s.os || "Unknown OS",
        location: s.country || "",
        lastActiveAt: s.lastActive || s.createdAt || new Date().toISOString(),
        createdAt: s.createdAt || new Date().toISOString(),
        expiresAt: s.expiresAt,
        status: s.isActive ? "active" : "revoked",
        isCurrentDevice: false,
        userAgent: "",
      }));
    },
  });

  const revokeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiClient.delete(apiRoutes.auth.revokeSession(sessionId));
    },
    onSuccess: () => {
      toast.success("تم إنهاء الجلسة");
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
    },
  });

  const revokeAllOthers = useMutation({
    mutationFn: async () => {
      return apiClient.delete(apiRoutes.auth.sessions);
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
