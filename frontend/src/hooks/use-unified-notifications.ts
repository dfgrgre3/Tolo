"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api/admin-api";
import { apiRoutes } from "@/lib/api/routes";
import { useWebSocket } from "@/contexts/websocket-context";
import { toast } from "sonner";

export type NotificationChannel = "in-app" | "email" | "sms" | "push";

export interface UnifiedNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  status: "pending" | "sent" | "delivered" | "failed" | "read";
  metadata?: {
    actionUrl?: string;
    icon?: string;
    priority?: "high" | "normal" | "low";
  };
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  targetAudience: {
    segments?: string[];
    userIds?: string[];
    filter?: Record<string, unknown>;
  };
  channels: NotificationChannel[];
  stats: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    read: number;
  };
  scheduledFor?: string;
  sentAt?: string;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
  createdBy: string;
  createdAt: string;
}

interface UseUnifiedNotificationsOptions {
  enableRealtime?: boolean;
  onNewNotification?: (notification: UnifiedNotification) => void;
}

export function useUnifiedNotifications(options: UseUnifiedNotificationsOptions = {}) {
  const { enableRealtime = true, onNewNotification } = options;
  const queryClient = useQueryClient();
  const { socket, isConnected } = useWebSocket();
  const [realtimeNotifications, setRealtimeNotifications] = useState<UnifiedNotification[]>([]);

  // Fetch all broadcasts
  const broadcastsQuery = useQuery({
    queryKey: ["admin", "broadcasts"],
    queryFn: async () => {
      const response = await adminFetch("/admin/broadcasts");
      if (!response.ok) throw new Error("Failed to fetch broadcasts");
      const data = await response.json();
      return (data.data?.broadcasts || data.broadcasts || []) as BroadcastMessage[];
    },
    refetchInterval: isConnected ? false : 60000,
  });

  // Fetch notification stats
  const statsQuery = useQuery({
    queryKey: ["admin", "notification-stats"],
    queryFn: async () => {
      const response = await adminFetch("/admin/notifications/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      return data.data || data;
    },
    refetchInterval: 30000,
  });

  // Send broadcast mutation
  const sendBroadcast = useMutation({
    mutationFn: async (payload: {
      userIds: string[];
      title: string;
      message: string;
      type: string;
      channels: NotificationChannel[];
      actionUrl?: string;
      priority?: "high" | "normal" | "low";
      scheduledFor?: string;
    }) => {
      const response = await adminFetch("/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send broadcast");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إرسال الإشعار بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "notification-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل إرسال الإشعار");
    },
  });

  // Schedule broadcast mutation
  const scheduleBroadcast = useMutation({
    mutationFn: async (payload: {
      userIds: string[];
      title: string;
      message: string;
      type: string;
      channels: NotificationChannel[];
      scheduledFor: string;
      actionUrl?: string;
      priority?: "high" | "normal" | "low";
    }) => {
      const response = await adminFetch("/admin/notifications/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to schedule broadcast");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("تم جدولة الإشعار بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل جدولة الإشعار");
    },
  });

  // Cancel scheduled broadcast
  const cancelBroadcast = useMutation({
    mutationFn: async (broadcastId: string) => {
      const response = await adminFetch(`/admin/notifications/broadcast/${broadcastId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to cancel broadcast");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إلغاء الإشعار المجدول");
      queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
    },
  });

  // Send push notification to specific users
  const sendPushNotification = useCallback(
    async (userIds: string[], title: string, body: string, data?: Record<string, unknown>) => {
      try {
        const response = await adminFetch("/admin/notifications/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds, title, body, data }),
        });

        if (!response.ok) throw new Error("Failed to send push notification");

        toast.success("تم إرسال الإشعار الفوري");
        return true;
      } catch {
        toast.error("فشل إرسال الإشعار الفوري");
        return false;
      }
    },
    []
  );

  // Real-time notification listener
  useEffect(() => {
    if (!socket || !enableRealtime) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "notification-delivered" || message.type === "notification-status") {
          const notification: UnifiedNotification = {
            id: message.id || crypto.randomUUID(),
            userId: message.userId,
            type: message.notificationType || "system",
            title: message.title || "إشعار جديد",
            message: message.message || message.description,
            channels: message.channels || ["in-app"],
            status: message.status || "sent",
            metadata: message.metadata,
            createdAt: message.createdAt || new Date().toISOString(),
            updatedAt: message.updatedAt || new Date().toISOString(),
          };

          setRealtimeNotifications((prev) => [notification, ...prev].slice(0, 50));
          onNewNotification?.(notification);

          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ["admin", "notification-stats"] });
        }

        // Handle broadcast completion
        if (message.type === "broadcast-completed") {
          toast.success(`اكتمل البث: ${message.success} نجاح، ${message.failed} فشل`);
          queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
        }
      } catch {
        // Silently ignore parsing errors
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, enableRealtime, onNewNotification, queryClient]);

  // Resend failed notifications
  const resendFailed = useMutation({
    mutationFn: async (broadcastId: string) => {
      const response = await adminFetch(`/admin/notifications/broadcast/${broadcastId}/retry`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to retry");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تمت إعادة محاولة إرسال الإشعارات الفاشلة");
      queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
    },
  });

  return {
    // Queries
    broadcasts: broadcastsQuery.data || [],
    stats: statsQuery.data,
    isLoading: broadcastsQuery.isLoading || statsQuery.isLoading,
    isError: broadcastsQuery.isError || statsQuery.isError,
    realtimeNotifications,

    // Mutations
    sendBroadcast: sendBroadcast.mutate,
    sendBroadcastAsync: sendBroadcast.mutateAsync,
    isSendingBroadcast: sendBroadcast.isPending,

    scheduleBroadcast: scheduleBroadcast.mutate,
    isScheduling: scheduleBroadcast.isPending,

    cancelBroadcast: cancelBroadcast.mutate,
    isCancelling: cancelBroadcast.isPending,

    sendPushNotification,
    resendFailed: resendFailed.mutate,
    isResending: resendFailed.isPending,

    // Helpers
    refetch: () => {
      broadcastsQuery.refetch();
      statsQuery.refetch();
    },
  };
}

// Hook for tracking notification delivery status
export function useNotificationDeliveryStatus(broadcastId: string) {
  const { socket } = useWebSocket();
  const [status, setStatus] = useState<{
    sent: number;
    delivered: number;
    failed: number;
    read: number;
    total: number;
  }>({ sent: 0, delivered: 0, failed: 0, read: 0, total: 0 });

  useEffect(() => {
    if (!socket || !broadcastId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "broadcast-progress" && message.broadcastId === broadcastId) {
          setStatus(message.stats);
        }
      } catch {
        // Ignore parsing errors
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, broadcastId]);

  return status;
}
