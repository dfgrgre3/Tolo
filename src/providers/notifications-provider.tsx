'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type Notification } from '@/types/notification';
import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api/api-client';
// import { scheduleNotificationChecks } from '@/lib/notification-scheduler';
import { toast } from 'sonner';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  markAsRead: (notificationIds?: string[], all?: boolean) => Promise<void>;
  loadMore: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
}

interface NotificationsProviderProps {
  children: React.ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastNotifiedId = useRef<string | null>(null);
  const isFirstFetch = useRef(true);
  const limit = 20;

  const fetchNotifications = useCallback(async (reset = false) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString()
      });

      const response = await apiClient.get<any>(`/notifications?${params}`);
      
      const payload = response?.data ?? response;
      const nextNotifications = Array.isArray(payload?.notifications) ? payload.notifications : (Array.isArray(payload) ? payload : []);
      const nextUnreadCount = typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0;
      const nextHasMore = typeof payload?.hasMore === 'boolean' ? payload.hasMore : nextNotifications.length === limit;

      if (reset) {
        setNotifications(nextNotifications);
        setOffset(limit);

        // Show toast for new notifications if not the first fetch
        if (!isFirstFetch.current && nextNotifications.length > 0) {
          const newest = nextNotifications[0];
          if (!newest.isRead && newest.id !== lastNotifiedId.current) {
            toast(newest.title, {
              description: newest.message,
              icon: newest.icon || '🔔'
            });
            lastNotifiedId.current = newest.id;
          }
        }
        isFirstFetch.current = false;
      } else {
        setNotifications((prev) => [...prev, ...nextNotifications]);
        setOffset(currentOffset + nextNotifications.length);
      }

      setUnreadCount(nextUnreadCount);
      setHasMore(nextHasMore);
    } catch (error) {
      logger.warn('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [offset, limit, isLoading]);

  const markAsRead = async (notificationIds?: string[], all = false) => {
    try {
      const response = await apiClient.post<any>('/notifications/mark-read', { 
        id: notificationIds ? notificationIds[0] : "", // Go backend handles 'id'
        all 
      });

      if (all) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } else if (notificationIds) {
        setNotifications((prev) =>
        prev.map((n) => notificationIds.includes(n.id) ? { ...n, isRead: true } : n)
        );
      }

      setUnreadCount(response.unreadCount ?? (all ? 0 : Math.max(0, unreadCount - (notificationIds?.length || 0))));

    } catch (error) {
      logger.error('Error marking notifications as read:', error);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchNotifications(false);
    }
  }, [isLoading, hasMore, fetchNotifications]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
    // You could also persist this to local storage or user settings
  }, []);

  useEffect(() => {
    fetchNotifications(true);
    // Only schedule if possible and hold onto cleanup function
    let cleanup: (() => void) | undefined;
    try {
      // scheduleNotificationChecks is currently disabled as the library was removed
      // cleanup = scheduleNotificationChecks?.();
    } catch (e) {
      logger.warn('Failed to schedule notification checks:', e);
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchNotifications,
    markAsRead,
    loadMore,
    soundEnabled,
    toggleSound
  }), [notifications, unreadCount, isLoading, hasMore, fetchNotifications, loadMore, soundEnabled, toggleSound, markAsRead]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>);

}