'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, MoreHorizontal } from 'lucide-react';
import { scheduleNotificationChecks } from '@/lib/notification-scheduler';
import { Button } from '@/shared/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSub,
} from '@/components/ui/dropdown-menu';
import { Badge } from "@/shared/badge";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  actionUrl?: string;
  icon?: string;
  createdAt: string;
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
  const limit = 10;

  // Fetch notifications
  const fetchNotifications = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });

      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();

      if (reset) {
        setNotifications(data.notifications);
        setOffset(0);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
        setOffset(currentOffset + limit);
      }

      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [offset, limit]);

  // Initial fetch and schedule notification checks
  useEffect(() => {
    fetchNotifications(true);
    scheduleNotificationChecks();
  }, []);

  // Mark notifications as read
  const markAsRead = async (notificationIds?: string[], all = false) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          notificationIds,
          all,
        }),
      });

      if (!response.ok) throw new Error('Failed to mark notifications as read');

      const data = await response.json();

      // Update local state
      if (all) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } else if (notificationIds) {
        setNotifications(prev => 
          prev.map(n => notificationIds.includes(n.id) ? { ...n, isRead: true } : n)
        );
      }

      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return date.toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Get notification icon
  const getNotificationIcon = (type: string, icon?: string) => {
    if (icon) return icon;

    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  // Load more notifications
  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchNotifications();
    }
  };

  return (
    <>
      {/* Notification bell icon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4 bg-transparent border-0 cursor-pointer">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-96">
          <div className="flex items-center justify-between p-2">
            <DropdownMenuLabel className="text-lg font-bold">الإشعارات</DropdownMenuLabel>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => markAsRead(undefined, true)}
                className="text-xs h-8"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                تحديد الكل كمقروء
              </Button>
            )}
          </div>
          <DropdownMenuSeparator />

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                لا توجد إشعارات
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-3 cursor-pointer flex-col items-start ${!notification.isRead ? 'bg-muted/30' : ''}`}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead([notification.id]);
                    }
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  <div className="flex w-full">
                    <div className="flex items-start gap-3 w-full">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-lg">
                          {getNotificationIcon(notification.type, notification.icon)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className={`font-medium truncate ${!notification.isRead ? 'font-bold' : ''}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(notification.createdAt)}
                            </span>
                            {!notification.isRead && (
                              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0"></span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}

            {hasMore && (
              <div className="p-2 text-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadMore}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'جاري التحميل...' : 'تحميل المزيد'}
                </Button>
              </div>
            )}
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-center justify-center text-primary font-medium">
            عرض جميع الإشعارات
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {children}
    </>
  );
}
