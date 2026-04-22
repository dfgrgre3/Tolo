"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminCard } from "../ui/admin-card";
import { AdminBadge } from "../ui/admin-badge";
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  X, 
  Wifi, 
  WifiOff, 
  MoreHorizontal 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RealtimeNotification {
  id: string;
  type: "user" | "activity" | "system" | "achievement" | "alert";
  title: string;
  description?: string;
  timestamp: Date;
  read?: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface RealtimeNotificationsProps {
  notifications: RealtimeNotification[];
  className?: string;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
  isConnected?: boolean;
  maxVisible?: number;
}

const typeConfig = {
  user: {
    icon: Bell,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "مستخدم",
  },
  activity: {
    icon: BellRing,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "نشاط",
  },
  system: {
    icon: Bell,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "نظام",
  },
  achievement: {
    icon: BellRing,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    label: "إنجاز",
  },
  alert: {
    icon: Bell,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "تنبيه",
  },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return new Date(date).toLocaleDateString("ar-EG");
}

// Memoized notification item for better performance
const NotificationItem = React.memo(function NotificationItem({
  notification,
  config,
  onMarkAsRead,
  onDismiss,
}: {
  notification: RealtimeNotification;
  config: typeof typeConfig[RealtimeNotification["type"]];
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "p-4 transition-colors hover:bg-muted/50",
        !notification.read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0",
            config.bg
          )}
        >
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className={cn(
                  "font-medium text-sm",
                  !notification.read && "text-primary"
                )}
              >
                {notification.title}
              </p>
              {notification.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {notification.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-muted rounded">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!notification.read && (
                  <DropdownMenuItem
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <Check className="h-4 w-4 ml-2" />
                    تحديد كمقروء
                  </DropdownMenuItem>
                )}
                {notification.actionUrl && (
                  <DropdownMenuItem asChild>
                    <a href={notification.actionUrl}>عرض التفاصيل</a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDismiss(notification.id)}
                  className="text-red-600"
                >
                  <X className="h-4 w-4 ml-2" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <AdminBadge variant="outline" size="sm">
              {config.label}
            </AdminBadge>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export function RealtimeNotifications({
  notifications,
  className,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  isConnected = true,
  maxVisible = 10,
}: RealtimeNotificationsProps) {
  const [localNotifications, setLocalNotifications] = React.useState(notifications);

  // Update local state when props change
  React.useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const unreadCount = React.useMemo(
    () => localNotifications.filter((n) => !n.read).length,
    [localNotifications]
  );
  const visibleNotifications = React.useMemo(
    () => localNotifications.slice(0, maxVisible),
    [localNotifications, maxVisible]
  );

  const handleMarkAsRead = (id: string) => {
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    onMarkAsRead?.(id);
  };

  const handleMarkAllAsRead = () => {
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onMarkAllAsRead?.();
  };

  const handleDismiss = (id: string) => {
    setLocalNotifications((prev) => prev.filter((n) => n.id !== id));
    onDismiss?.(id);
  };

  return (
    <AdminCard className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-5 w-5 text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-lg">الإشعارات</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
              isConnected
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                متصل
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                غير متصل
              </>
            )}
          </div>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8"
            >
              <CheckCheck className="h-4 w-4 ml-1" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="h-[400px] overflow-y-auto">
        {visibleNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="divide-y">
            {visibleNotifications.map((notification) => {
              const type = (notification.type || "system").toLowerCase() as keyof typeof typeConfig;
              const config = typeConfig[type] || typeConfig.system;
              return (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  config={config}
                  onMarkAsRead={handleMarkAsRead}
                  onDismiss={handleDismiss}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {localNotifications.length > maxVisible && (
        <div className="p-3 border-t text-center">
          <Button variant="ghost" size="sm" className="w-full">
            عرض الكل ({localNotifications.length})
          </Button>
        </div>
      )}
    </AdminCard>
  );
}

// Compact notification badge for header
interface NotificationBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

export function NotificationBadge({
  count,
  onClick,
  className,
}: NotificationBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-2 rounded-lg hover:bg-muted transition-colors",
        className
      )}
    >
      <Bell className="h-5 w-5 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

// Toast notification for real-time alerts
export function RealtimeToast({
  notification,
  onDismiss,
}: {
  notification: RealtimeNotification;
  onDismiss?: () => void;
}) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border shadow-lg bg-card",
        "animate-in slide-in-from-right-full"
      )}
    >
      <div className={cn("p-2 rounded-full", config.bg)}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{notification.title}</p>
        {notification.description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {notification.description}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-muted rounded"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
