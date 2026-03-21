"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminCard } from "../ui/admin-card";
import { AdminButton } from "../ui/admin-button";
import { AdminBadge } from "../ui/admin-badge";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  X,
  Bell,
} from "lucide-react";

interface Alert {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  description?: string;
  timestamp?: Date;
  metric?: {
    current: number;
    previous: number;
    change: number;
  };
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface SmartAlertsProps {
  alerts: Alert[];
  title?: string;
  className?: string;
  maxAlerts?: number;
  onDismiss?: (id: string) => void;
  onAction?: (id: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const alertConfig = {
  success: {
    icon: CheckCircle,
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-500/20",
    iconColor: "text-green-500",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-yellow-500/10",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-500/20",
    iconColor: "text-yellow-500",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
    iconColor: "text-red-500",
  },
  info: {
    icon: Info,
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    iconColor: "text-blue-500",
  },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} يوم`;
  return new Date(date).toLocaleDateString("ar-EG");
}

export function SmartAlerts({
  alerts,
  title = "تنبيهات ذكية",
  className,
  maxAlerts = 5,
  onDismiss,
  onAction,
}: SmartAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = React.useState<Set<string>>(new Set());

  const visibleAlerts = alerts
    .filter((alert) => !dismissedAlerts.has(alert.id))
    .slice(0, maxAlerts);

  const handleDismiss = (id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]));
    onDismiss?.(id);
  };

  const handleAction = (alert: Alert) => {
    if (alert.action?.onClick) {
      alert.action.onClick();
    }
    onAction?.(alert.id);
  };

  if (visibleAlerts.length === 0) {
    return (
      <AdminCard className={cn("overflow-hidden", className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {title}
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mb-2 opacity-50" />
          <p className="text-sm">لا توجد تنبيهات حالياً</p>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {title}
        </h3>
        <AdminBadge variant="outline" size="sm">
          {visibleAlerts.length} تنبيه
        </AdminBadge>
      </div>

      <div className="space-y-3">
        {visibleAlerts.map((alert, index) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={cn(
                "relative p-3 rounded-lg border transition-all",
                config.bg,
                config.border,
                "animate-in fade-in slide-in-from-right-2"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconColor)} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("font-medium text-sm", config.text)}>
                      {alert.title}
                    </p>
                    {onDismiss && (
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {alert.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.description}
                    </p>
                  )}

                  {alert.metric && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-medium">
                        {alert.metric.current.toLocaleString()}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-0.5 text-xs",
                          alert.metric.change > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {alert.metric.change > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(alert.metric.change).toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        مقارنة بالأسبوع الماضي
                      </span>
                    </div>
                  )}

                  {alert.action && (
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs"
                      onClick={() => handleAction(alert)}
                    >
                      {alert.action.label}
                    </AdminButton>
                  )}

                  {alert.timestamp && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(alert.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}

// Helper function to generate smart alerts from data
export function generateSmartAlerts(data: {
  users: { total: number; new: number; active: number };
  content: { subjects: number; exams: number; resources: number };
  activity: { studySessions: number; tasksCompleted: number };
  trends: { userGrowth: number; studyTime: number };
}): Alert[] {
  const alerts: Alert[] = [];

  // High user growth alert
  if (data.trends.userGrowth > 20) {
    alerts.push({
      id: "user-growth-high",
      type: "success",
      title: "نمو ممتاز في المستخدمين",
      description: `زيادة ${data.trends.userGrowth.toFixed(1)}% في عدد المستخدمين الجدد`,
      metric: {
        current: data.users.new,
        previous: Math.round(data.users.new / (1 + data.trends.userGrowth / 100)),
        change: data.trends.userGrowth,
      },
      action: {
        label: "عرض التفاصيل",
        href: "/admin/users",
      },
    });
  }

  // Low activity warning
  if (data.trends.studyTime < -20) {
    alerts.push({
      id: "study-time-low",
      type: "warning",
      title: "انخفاض في وقت الدراسة",
      description: `انخفاض ${Math.abs(data.trends.studyTime).toFixed(1)}% في وقت الدراسة`,
      metric: {
        current: data.activity.studySessions,
        previous: Math.round(data.activity.studySessions / (1 + data.trends.studyTime / 100)),
        change: data.trends.studyTime,
      },
      action: {
        label: "تحليل السبب",
        href: "/admin/analytics",
      },
    });
  }

  // New milestone alert
  if (data.users.total >= 100 && data.users.total < 110) {
    alerts.push({
      id: "milestone-users",
      type: "success",
      title: "إنجاز جديد!",
      description: `تجاوز عدد المستخدمين ${Math.floor(data.users.total / 100) * 100} مستخدم`,
      action: {
        label: "مشاركة الإنجاز",
      },
    });
  }

  // Content gap alert
  if (data.content.exams < 5 && data.content.subjects > 3) {
    alerts.push({
      id: "content-gap",
      type: "info",
      title: "فرصة لتحسين المحتوى",
      description: `يوجد ${data.content.subjects} مادة دراسية لكن فقط ${data.content.exams} امتحان`,
      action: {
        label: "إضافة امتحان",
        href: "/admin/exams",
      },
    });
  }

  return alerts;
}
