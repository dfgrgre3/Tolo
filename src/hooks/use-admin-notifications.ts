"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api/admin-api";
import { useWebSocket } from "@/contexts/websocket-context";
import type { RealtimeNotification } from "@/components/admin/dashboard/realtime-notifications";

export type AdminNotification = RealtimeNotification;

interface NotificationsResponse {
  notifications: RealtimeNotification[];
  unreadCount: number;
}

export function useAdminNotifications() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useWebSocket();
  const [realtimeNotifications, setRealtimeNotifications] = useState<RealtimeNotification[]>([]);

  // Fetch initial notifications
  const { data, isLoading, error, refetch } = useQuery<NotificationsResponse>({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const response = await adminFetch("/admin/notifications?limit=50");
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const json = await response.json();
      
      // Transform the data
      const notifications: RealtimeNotification[] = (json.data?.notifications || json.notifications || []).map((n: any) => ({
        ...n,
        timestamp: new Date(n.createdAt || n.timestamp || Date.now()),
        read: n.read ?? false,
      }));
      
      return {
        notifications,
        unreadCount: json.data?.unreadCount || json.unreadCount || notifications.filter((n) => !n.read).length,
      };
    },
    // Only use polling fallback when WebSocket is not connected
    refetchInterval: isConnected ? false : 60000, // 60 seconds fallback when WS is down
    refetchIntervalInBackground: false, // Don't refetch when tab is hidden
  });

  // Listen for WebSocket messages with reconnection logic
  useEffect(() => {
    if (!socket) return;

    let reconnectTimeout: NodeJS.Timeout;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "notification" || message.type === "admin-notification") {
          const newNotification: RealtimeNotification = {
            id: message.id || crypto.randomUUID(),
            type: message.notificationType || "system",
            title: message.title || "إشعار جديد",
            description: message.message || message.description,
            timestamp: new Date(),
            read: false,
            actionUrl: message.actionUrl,
            metadata: message.metadata,
          };

          setRealtimeNotifications((prev) => [newNotification, ...prev]);

          // Invalidate query to refresh the list
          queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
        }
      } catch {
        // Silently ignore parsing errors
      }
    };

    const handleReconnect = () => {
      // Force refetch when connection is restored
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    };

    socket.addEventListener("message", handleMessage);
    socket.addEventListener("open", handleReconnect);

    return () => {
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("open", handleReconnect);
      clearTimeout(reconnectTimeout);
    };
  }, [socket, queryClient]);

  // Combine fetched and realtime notifications
  const allNotifications = [
    ...realtimeNotifications,
    ...(data?.notifications || []),
  ].slice(0, 50); // Keep only latest 50

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      await adminFetch(`/admin/notifications/${id}/read`, {
        method: "POST",
      });
      
      // Update local state
      setRealtimeNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      
      // Invalidate query
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    } catch {
      // Silently fail
    }
  }, [queryClient]);

  const markAllAsRead = useCallback(async () => {
    try {
      await adminFetch("/admin/notifications/read-all", {
        method: "POST",
      });
      
      // Update local state
      setRealtimeNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      
      // Invalidate query
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    } catch {
      // Silently fail
    }
  }, [queryClient]);

  const dismiss = useCallback(async (id: string) => {
    try {
      await adminFetch(`/admin/notifications/${id}`, {
        method: "DELETE",
      });
      
      // Remove from local state
      setRealtimeNotifications((prev) =>
        prev.filter((n) => n.id !== id)
      );
      
      // Invalidate query
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    } catch {
      // Silently fail
    }
  }, [queryClient]);

  return {
    notifications: allNotifications,
    unreadCount,
    isLoading,
    error,
    isConnected,
    refetch,
    markAsRead,
    markAllAsRead,
    dismiss,
  };
}
