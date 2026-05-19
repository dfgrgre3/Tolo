"use client";

import * as React from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
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
  MoreHorizontal,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function fixDoubleEncoding(str: string | undefined | null): string {
  if (!str) return "";
  // Check if string contains typical signature of double-encoded Arabic/Emoji bytes
  if (!str.includes("ًں") && !str.includes("ط£") && !str.includes("ط¨")) return str;
  try {
    const bytes = new Uint8Array(
      Array.from(str).map((char) => {
        const code = char.charCodeAt(0);
        // Map common CP1252 / high ANSI characters that get mapped by JS
        if (code === 0x153 || code === 0x152) return 0x8c;
        if (code === 0x201d || code === 0x201c) return 0x93;
        if (code === 0x2014) return 0x97;
        if (code === 0x2c6) return 0x88;
        if (code === 0x2019) return 0x92;
        if (code === 0x2018) return 0x91;
        if (code === 0x2022) return 0x95;
        if (code === 0x2013) return 0x96;
        if (code === 0x203a) return 0x9b;
        if (code === 0x20ac) return 0x80;
        return code & 0xff;
      })
    );
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (e) {
    return str;
  }
}

export interface RealtimeNotification {
  id: string;
  type: "user" | "activity" | "system" | "achievement" | "alert" | "payment";
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

const typeConfig: Record<RealtimeNotification["type"], { icon: typeof Bell; color: string; bg: string; label: string }> = {
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
  payment: {
    icon: Bell,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "دفع",
  },
};

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
                {fixDoubleEncoding(notification.title)}
              </p>
              {notification.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fixDoubleEncoding(notification.description)}
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

const EMPTY_ARRAY: any[] = [];

export function RealtimeNotifications({
  notifications = EMPTY_ARRAY,
  className,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  isConnected = true,
  maxVisible = 10,
}: RealtimeNotificationsProps) {
  const [localNotifications, setLocalNotifications] = React.useState(notifications);
  const [typeFilter, setTypeFilter] = React.useState<RealtimeNotification["type"] | "all">("all");

  // Update local state when props change
  React.useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  // Filter notifications by type
  const filteredNotifications = React.useMemo(() => {
    if (typeFilter === "all") return localNotifications;
    return localNotifications.filter(n => n.type === typeFilter);
  }, [localNotifications, typeFilter]);

  const unreadCount = React.useMemo(
    () => localNotifications.filter((n) => !n.read).length,
    [localNotifications]
  );
  const visibleNotifications = React.useMemo(
    () => filteredNotifications.slice(0, maxVisible),
    [filteredNotifications, maxVisible]
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

  // Export ALL notifications to JSON
  const handleExportAll = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      count: localNotifications.length,
      filter: "all",
      notifications: localNotifications.map(n => ({
        ...n,
        timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp,
      })),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notifications-all-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("تم تصدير جميع الإشعارات بنجاح");
  };

  // Export FILTERED notifications to JSON
  const handleExportFiltered = () => {
    const suffix = typeFilter !== "all" ? `-${typeFilter}` : "";
    
    const data = {
      exportedAt: new Date().toISOString(),
      count: filteredNotifications.length,
      filter: typeFilter,
      notifications: filteredNotifications.map(n => ({
        ...n,
        timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp,
      })),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notifications${suffix}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(typeFilter !== "all" ? `تم تصدير إشعارات ${typeFilter} بنجاح` : "تم تصدير الإشعارات المعروضة بنجاح");
  };

  // Export to CSV helpers
  const generateCSV = (notificationsToExport: RealtimeNotification[], fileSuffix: string) => {
    const headers = ["ID", "Type", "Title", "Description", "Timestamp", "Read"];
    const rows = notificationsToExport.map(n => [
      n.id,
      n.type,
      n.title,
      n.description || "",
      n.timestamp instanceof Date ? n.timestamp.toISOString() : String(n.timestamp),
      n.read ? "Yes" : "No",
    ]);
    
    const escapeCsv = (field: unknown) => {
      const str = String(field);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csv = [
      headers.join(","), 
      ...rows.map(r => r.map(escapeCsv).join(","))
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notifications${fileSuffix}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export ALL to CSV
  const handleExportCSVAll = () => {
    generateCSV(localNotifications, "-all");
    toast.success("تم تصدير جميع الإشعارات بصيغة CSV");
  };

  // Export FILTERED to CSV
  const handleExportCSVFiltered = () => {
    const suffix = typeFilter !== "all" ? `-${typeFilter}` : "";
    generateCSV(filteredNotifications, suffix);
    toast.success(typeFilter !== "all" ? `تم تصدير إشعارات ${typeFilter} بصيغة CSV` : "تم تصدير الإشعارات المعروضة بصيغة CSV");
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

          {/* Type Filter */}
          {localNotifications.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as RealtimeNotification["type"] | "all")}
              className="h-8 px-2 text-xs rounded-md border border-white/10 bg-black/20 text-white"
            >
              <option value="all">الكل ({localNotifications.length})</option>
              <option value="user">مستخدمين</option>
              <option value="activity">أنشطة</option>
              <option value="system">نظام</option>
              <option value="achievement">إنجازات</option>
              <option value="alert">تنبيهات</option>
              <option value="payment">مدفوعات</option>
            </select>
          )}

          {/* Export dropdown */}
          {localNotifications.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <Download className="h-4 w-4 ml-1" />
                  تصدير
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportAll}>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير الكل JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSVAll}>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير الكل CSV
                </DropdownMenuItem>
                {typeFilter !== "all" && filteredNotifications.length > 0 && (
                  <>
                    <DropdownMenuItem onClick={handleExportFiltered}>
                      <Download className="h-4 w-4 ml-2 text-primary" />
                      تصدير {typeFilter} JSON ({filteredNotifications.length})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSVFiltered}>
                      <Download className="h-4 w-4 ml-2 text-primary" />
                      تصدير {typeFilter} CSV ({filteredNotifications.length})
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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

function NotificationBadge({
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
function RealtimeToast({
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
        <p className="font-medium text-sm">{fixDoubleEncoding(notification.title)}</p>
        {notification.description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {fixDoubleEncoding(notification.description)}
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
