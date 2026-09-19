"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryProfiles } from "@/lib/query/query-profiles";
import { useAuth } from "@/hooks/use-auth";
import * as notificationsApi from "../api/notifications-gateway";

// ─── مفاتيح الـ Query ─────────────────────────────────────────────

export const notificationKeys = {
  all: () => ["notifications"] as const,
  list: () => ["notifications", "list"] as const,
};

// ─── Hook: قائمة الإشعارات ────────────────────────────────────────

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: notificationsApi.fetchNotifications,
    enabled: isAuthenticated,
    ...queryProfiles.financial,
  });
}

// ─── Mutations ────────────────────────────────────────────────────

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}
