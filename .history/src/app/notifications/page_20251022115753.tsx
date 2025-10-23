'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Clock } from 'lucide-react';
import { Button } from "@/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function NotificationsPage() {
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

  // Initial fetch
  useEffect(() => {
    fetchNotifications(true);
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

  // Get notification type color
  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Load more notifications
  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchNotifications();
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Bell className="h-8 w-8 text-blue-600" />
          الإشعارات
        </h1>
        <p className="text-gray-600">
          عرض جميع الإشعارات والتنبيهات
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>الإشعارات</CardTitle>
              <CardDescription>
                {unreadCount > 0 
                  ? `لديك ${unreadCount} إشعار${unreadCount > 1 ? 'ات غير مقروءة' : ' غير مقروء'}`
                  : 'لا توجد إشعارات غير مقروءة'
                }
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                onClick={() => markAsRead(undefined, true)}
                className="flex items-center gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                تحديد الكل كمقروء
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">لا توجد إشعارات</h3>
              <p className="text-gray-500">سيتم عرض الإشعارات هنا عند توفرها</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.isRead 
                      ? 'bg-white border-gray-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex gap-4">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="text-lg">
                        {getNotificationIcon(notification.type, notification.icon)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`font-medium ${!notification.isRead ? 'font-bold' : ''}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getNotificationTypeColor(notification.type)}`}
                            >
                              {notification.type === 'info' && 'معلومات'}
                              {notification.type === 'success' && 'نجاح'}
                              {notification.type === 'warning' && 'تحذير'}
                              {notification.type === 'error' && 'خطأ'}
                            </Badge>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(notification.createdAt)}
                            </div>
                          </div>
                        </div>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-2"></span>
                        )}
                      </div>
                      <p className="mt-2 text-gray-700">
                        {notification.message}
                      </p>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex gap-2">
                          {!notification.isRead && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => markAsRead([notification.id])}
                              className="h-8 px-2 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              تحديد كمقروء
                            </Button>
                          )}
                          {notification.actionUrl && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.location.href = notification.actionUrl!}
                              className="h-8 px-2 text-xs"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              الانتقال
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="text-center mt-6">
                  <Button 
                    variant="outline" 
                    onClick={loadMore}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'جاري التحميل...' : 'تحميل المزيد'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
