"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@/types/user";
import type { Notification } from "@/types/notification";
import { soundNotificationManager } from "@/lib/notifications/sound-notifications";

type NotificationFilter = "all" | "unread";

interface UseNotificationsResult {
  notificationCount: number;
  filteredNotifications: Notification[];
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(user: User | null, mounted: boolean): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [soundEnabled, setSoundEnabled] = useState(soundNotificationManager.isEnabled());

  const refreshNotifications = useCallback(async () => {
    if (!mounted || !user) return;

    try {
      const response = await fetch("/api/notifications?limit=50");
      if (!response.ok) return;

      const data = await response.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // Keep the UI usable even if the fetch fails.
    }
  }, [mounted, user]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead),
    [notifications]
  );

  const filteredNotifications = useMemo(
    () => (filter === "unread" ? unreadNotifications : notifications),
    [filter, notifications, unreadNotifications]
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      )
    );

    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [notificationId] }),
    }).catch(() => undefined);
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));

    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined);
  }, []);

  const toggleSound = useCallback(() => {
    const nextValue = !soundNotificationManager.isEnabled();
    soundNotificationManager.setEnabled(nextValue);
    setSoundEnabled(nextValue);
  }, []);

  return {
    notificationCount: unreadNotifications.length,
    filteredNotifications,
    filter,
    setFilter,
    soundEnabled,
    toggleSound,
    markAsRead,
    markAllAsRead,
  };
}
