'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type Notification } from '@/types/notification';
import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api/api-client';

import { toast } from 'sonner';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuthContext } from '@/contexts/auth-context';

// GET /api/notifications / POST /api/notifications/mark-read
// (notification_handler.go's GetNotifications/MarkNotificationRead) were
// fully built - keyset pagination, L1+Redis caching, WebSocket broadcast on
// mark-read - but never mounted on any route. See protected_routes.go where
// they're wired alongside the rest of the user-facing routes.
//
// GetNotifications returns a bare array with no unreadCount/hasMore
// alongside it, and MarkNotificationRead returns only {success: true} with
// no unreadCount either - both are derived client-side instead.
interface MarkReadResponse {
  success: boolean;
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

const defaultNotificationsContext: NotificationsContextType = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  loadMore: () => {},
  soundEnabled: true,
  toggleSound: () => {}
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    return defaultNotificationsContext;
  }
  return context;
}

function parseNotificationsResponse(response: unknown, limit: number) {
  // GetNotifications returns a bare array (api_response.Success(c, notifications)),
  // not {notifications: [...]} - it has no separate unread-count or hasMore
  // field, so both are derived from the page actually returned.
  if (Array.isArray(response)) {
    return {
      nextNotifications: response as Notification[],
      nextUnreadCount: (response as Notification[]).filter((n) => !n.isRead).length,
      nextHasMore: response.length === limit
    };
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
  const [, setOffset] = useState(0);
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

      const response = await apiClient.get<Notification[]>(`/notifications?${params}`);
      
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
      // MarkNotificationRead has no "all" field or bulk-by-list support: an
      // empty/absent id marks everything read, and any other id marks just
      // that one notification. Marking several specific ids therefore needs
      // one call per id, not the single first-id-only call this used to send
      // (which silently left the rest unread server-side).
      if (all || !notificationIds) {
        await apiClient.post<MarkReadResponse>('/notifications/mark-read', { id: '' });
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        return;
      }

      await Promise.all(
        notificationIds.map((id) => apiClient.post<MarkReadResponse>('/notifications/mark-read', { id }))
      );
      setNotifications((prev) =>
        prev.map((n) => (notificationIds.includes(n.id) ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
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
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthContext();

  // Use a stable ref so the polling interval always reads the latest auth state
  // without being re-created on every render.
  const isAuthReadyRef = useRef(false);
  useEffect(() => {
    // Auth is "ready" once the initial loading resolves and the user is authenticated.
    isAuthReadyRef.current = !isAuthLoading && isAuthenticated;
  }, [isAuthLoading, isAuthenticated]);

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

  const isConnectedRef = useRef(isConnected);
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    // Only fetch notifications for authenticated users.
    if (!isAuthenticated || isAuthLoading) return;

    // Defer initial fetch to idle time so it doesn't block critical page load / LCP
    const idleId = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback(() => fetchNotifications(true), { timeout: 3000 })
      : setTimeout(() => fetchNotifications(true), 1500);

    // Poll conservatively as a fallback for WebSocket.
    const pollInterval = setInterval(() => {
      if (isAuthReadyRef.current && !isConnectedRef.current) {
        fetchNotifications(true);
      }
    }, 300000);

    return () => {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof idleId === 'number') {
        window.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId as any);
      }
      clearInterval(pollInterval);
    };
  }, [fetchNotifications, isAuthenticated, isAuthLoading]);

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
  }), [notifications, unreadCount, isLoading, hasMore, fetchNotifications, loadMore, soundEnabled, toggleSound]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
