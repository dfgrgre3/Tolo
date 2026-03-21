"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AdminCard } from "../ui/admin-card";
import { AdminButton, IconButton } from "../ui/admin-button";
import { AdminBadge, StatusBadge, CountBadge } from "../ui/admin-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Trophy,
  Target,
  Clock,
  Calendar,
  Bell,
  FileText,
  Zap,
  Award,
  MessageSquare,
  Activity,
  ChevronLeft,
  MoreHorizontal,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

// Activity Feed Widget
interface ActivityItem {
  id: string;
  type: "user" | "exam" | "achievement" | "challenge" | "post" | "comment";
  title: string;
  description?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

const activityConfig = {
  user: { icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", label: "مستخدم جديد" },
  exam: { icon: Target, color: "text-green-500", bg: "bg-green-500/10", label: "امتحان" },
  achievement: { icon: Award, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "إنجاز" },
  challenge: { icon: Trophy, color: "text-purple-500", bg: "bg-purple-500/10", label: "تحدي" },
  post: { icon: FileText, color: "text-cyan-500", bg: "bg-cyan-500/10", label: "منشور" },
  comment: { icon: MessageSquare, color: "text-pink-500", bg: "bg-pink-500/10", label: "تعليق" },
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

export function ActivityFeed({
  activities,
  title = "آخر النشاطات",
  maxItems = 5,
  showViewAll = true,
  onViewAll,
  onRefresh,
  loading = false,
  className,
}: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <AdminCard className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {title}
        </h3>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <IconButton
              icon={RefreshCw}
              label="تحديث"
              variant="ghost"
              size="icon-sm"
              onClick={onRefresh}
              className={loading ? "animate-spin" : ""}
            />
          )}
          {showViewAll && onViewAll && (
            <AdminButton variant="ghost" size="sm" onClick={onViewAll}>
              عرض الكل
              <ChevronLeft className="h-4 w-4 mr-1" />
            </AdminButton>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {loading ? (
          // Loading skeleton
          Array.from({ length: maxItems }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))
        ) : displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">لا توجد نشاطات حديثة</p>
          </div>
        ) : (
          displayActivities.map((activity, index) => {
            const config = activityConfig[activity.type];
            const Icon = config.icon;

            return (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50",
                  "animate-in fade-in slide-in-from-right-2"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {activity.user ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activity.user.avatar} />
                    <AvatarFallback>
                      {activity.user.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", config.bg)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>

                <AdminBadge variant="outline" size="sm" className="flex-shrink-0">
                  {config.label}
                </AdminBadge>
              </div>
            );
          })
        )}
      </div>
    </AdminCard>
  );
}

// Quick Actions Widget
interface QuickAction {
  title: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "cyan" | "orange" | "pink";
  badge?: number;
  permission?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  layout?: "grid" | "list";
  className?: string;
}

const actionColors = {
  blue: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  green: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  yellow: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
  red: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  purple: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  cyan: "bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20",
  orange: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  pink: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20",
};

import { usePermission } from "@/components/auth/PermissionGuard";

export function QuickActions({
  actions,
  title = "إجراءات سريعة",
  layout = "grid",
  className,
}: QuickActionsProps) {
  const { hasPermission } = usePermission();

  const filteredActions = actions.filter(
    (action) => !action.permission || hasPermission(action.permission as any)
  );

  if (filteredActions.length === 0) return null;

  const content = (
    <div
      className={cn(
        layout === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" : "space-y-2",
        className
      )}
    >
      {filteredActions.map((action, index) => {
        const colorClass = actionColors[action.color || "blue"];
        const Icon = action.icon;

        const inner = (
          <div
            className={cn(
              "group flex items-center gap-3 rounded-xl p-3 transition-all",
              layout === "grid" ? "flex-col text-center" : "flex-row",
              "hover:shadow-md hover:-translate-y-0.5",
              "animate-in fade-in zoom-in-95"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                colorClass
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className={cn(layout === "grid" && "text-center")}>
              <p className="text-sm font-medium flex items-center gap-1 justify-center">
                {action.title}
                {action.badge && <CountBadge count={action.badge} />}
              </p>
              {action.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              )}
            </div>
          </div>
        );

        if (action.href) {
          return (
            <Link
              key={index}
              href={action.href}
              className="rounded-xl border bg-card hover:bg-accent transition-colors"
            >
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={index}
            onClick={action.onClick}
            className="rounded-xl border bg-card hover:bg-accent transition-colors text-right w-full"
          >
            {inner}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        {title}
      </h3>
      {content}
    </div>
  );
}

// Upcoming Events Widget
interface UpcomingEvent {
  id: string;
  title: string;
  date: Date;
  type: "exam" | "event" | "deadline" | "meeting";
  location?: string;
  participants?: number;
}

interface UpcomingEventsProps {
  events: UpcomingEvent[];
  title?: string;
  maxItems?: number;
  className?: string;
}

const eventConfig = {
  exam: { icon: Target, color: "text-red-500", bg: "bg-red-500/10" },
  event: { icon: Calendar, color: "text-green-500", bg: "bg-green-500/10" },
  deadline: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  meeting: { icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
};

export function UpcomingEvents({
  events,
  title = "الأحداث القادمة",
  maxItems = 4,
  className,
}: UpcomingEventsProps) {
  const displayEvents = events.slice(0, maxItems);

  return (
    <AdminCard className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {title}
        </h3>
        <AdminBadge variant="outline" size="sm">
          {events.length} حدث
        </AdminBadge>
      </div>

      <div className="flex-1 space-y-3">
        {displayEvents.map((event, index) => {
          const config = eventConfig[event.type];
          const Icon = config.icon;
          const eventDate = new Date(event.date);
          const isToday = eventDate.toDateString() === new Date().toDateString();

          return (
            <div
              key={event.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50",
                isToday && "border-primary/50 bg-primary/5"
              )}
            >
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", config.bg)}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {eventDate.toLocaleDateString("ar-EG", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {event.location && ` • ${event.location}`}
                </p>
              </div>

              {isToday && (
                <AdminBadge status="warning" size="sm">
                  اليوم
                </AdminBadge>
              )}
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}

// Top Performers Widget
interface Performer {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  xp: number;
  streak: number;
  rank: number;
}

interface TopPerformersProps {
  performers: Performer[];
  title?: string;
  className?: string;
}

export function TopPerformers({
  performers,
  title = "أفضل المتفوقين",
  className,
}: TopPerformersProps) {
  return (
    <AdminCard className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {title}
        </h3>
      </div>

      <div className="flex-1 space-y-2">
        {performers.map((performer, index) => (
          <div
            key={performer.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50",
              index === 0 && "bg-yellow-500/5 border border-yellow-500/20",
              index === 1 && "bg-gray-500/5 border border-gray-500/20",
              index === 2 && "bg-orange-500/5 border border-orange-500/20"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                index === 0 && "bg-yellow-500 text-white",
                index === 1 && "bg-gray-400 text-white",
                index === 2 && "bg-orange-500 text-white",
                index > 2 && "bg-muted text-muted-foreground"
              )}
            >
              {performer.rank}
            </span>

            <Avatar className="h-10 w-10">
              <AvatarImage src={performer.avatar} />
              <AvatarFallback>{performer.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{performer.name}</p>
              <p className="text-xs text-muted-foreground">المستوى {performer.level}</p>
            </div>

            <div className="text-left">
              <p className="text-sm font-bold text-primary">{performer.xp.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

// Progress Overview Widget
interface ProgressItem {
  id: string;
  label: string;
  current: number;
  target: number;
  color?: keyof typeof actionColors;
}

interface ProgressOverviewProps {
  items: ProgressItem[];
  title?: string;
  className?: string;
}

export function ProgressOverview({
  items,
  title = "نظرة عامة على التقدم",
  className,
}: ProgressOverviewProps) {
  return (
    <AdminCard className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {title}
        </h3>
      </div>

      <div className="flex-1 space-y-4">
        {items.map((item, index) => {
          const percentage = Math.min(100, Math.round((item.current / item.target) * 100));
          const color = item.color || "blue";

          return (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.current.toLocaleString()} / {item.target.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    color === "blue" && "bg-blue-500",
                    color === "green" && "bg-green-500",
                    color === "yellow" && "bg-yellow-500",
                    color === "red" && "bg-red-500",
                    color === "purple" && "bg-purple-500",
                    color === "cyan" && "bg-cyan-500",
                    color === "orange" && "bg-orange-500",
                    color === "pink" && "bg-pink-500"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-left">{percentage}% مكتمل</p>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}
