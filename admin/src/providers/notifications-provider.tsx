'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type Notification } from '@/types/notification';
import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api/api-client';
// import { scheduleNotificationChecks } from '@/lib/notification-scheduler';
import { toast } from 'sonner';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/contexts/auth-context';

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
}

interface MarkReadResponse {
  success: boolean;
  unreadCount?: number;
}

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

function parseNotificationsResponse(response: unknown, limit: number) {
  if (response && typeof response === 'object') {
    if (Array.isArray(response)) {
      return {
        nextNotifications: response as Notification[],
        nextUnreadCount: (response as Notification[]).filter((n) => !n.isRead).length,
        nextHasMore: response.length === limit
      };
    } else if ('notifications' in response && Array.isArray((response as Record<string, unknown>).notifications)) {
      const resp = response as NotificationsResponse;
      return {
        nextNotifications: resp.notifications,
        nextUnreadCount: resp.unreadCount ?? 0,
        nextHasMore: resp.hasMore ?? (resp.notifications.length === limit)
      };
    }
  }
  return { nextNotifications: [] as Notification[], nextUnreadCount: 0, nextHasMore: false };
}

function handleNewNotificationToast(
  nextNotifications: Notification[],
  isFirstFetch: boolean,
  lastNotifiedIdRef: React.MutableRefObject<string | null>
) {
  if (isFirstFetch || nextNotifications.length === 0) return;
  
  const newest = nextNotifications[0]!;
  if (!newest.isRead && newest.id !== lastNotifiedIdRef.current) {
    toast(newest.title, {
      description: newest.message,
      icon: newest.icon || '🔔'
    });
    lastNotifiedIdRef.current = newest.id;
  }
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

  const isLoadingRef = useRef(false);
  const offsetRef = useRef(0);

  const fetchNotifications = useCallback(async (reset = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const currentOffset = reset ? 0 : offsetRef.current;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString()
      });

      const response = await apiClient.get<NotificationsResponse | Notification[]>(`/notifications?${params}`);
      
      const { nextNotifications, nextUnreadCount, nextHasMore } = parseNotificationsResponse(response, limit);

      if (reset) {
        setNotifications(nextNotifications);
        offsetRef.current = limit;
        setOffset(limit);

        handleNewNotificationToast(nextNotifications, isFirstFetch.current, lastNotifiedId);
        isFirstFetch.current = false;
      } else {
        setNotifications((prev) => [...prev, ...nextNotifications]);
        offsetRef.current = currentOffset + nextNotifications.length;
        setOffset(offsetRef.current);
      }

      setUnreadCount(nextUnreadCount);
      setHasMore(nextHasMore);
    } catch (error) {
      logger.warn('Error fetching notifications:', error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [limit]); // Stable dependency

  const markAsRead = async (notificationIds?: string[], all = false) => {
    try {
      const response = await apiClient.post<MarkReadResponse>('/notifications/mark-read', { 
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
  }, []);

  const { socket, isConnected } = useWebSocket();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' || data.type === 'refresh_notifications') {
          fetchNotifications(true);
          
          if (data.payload && data.payload.title) {
            toast(data.payload.title, {
              description: data.payload.message,
              icon: data.payload.icon || '🔔'
            });
          }
        }
      } catch (error) {
        logger.debug('Failed to parse WebSocket message in NotificationsProvider', error);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, isConnected, fetchNotifications]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(true);
    }

    // Poll for notifications every 60 seconds as a fallback for WebSocket
    const pollInterval = setInterval(() => {
      if (isAuthenticated && !isConnected) {
        fetchNotifications(true);
      }
    }, 60000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchNotifications, isConnected, isAuthenticated]);

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