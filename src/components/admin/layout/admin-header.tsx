"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Menu, LogOut, Moon, Sun, ChevronLeft, Settings, Shield, Users, Trophy, AlertCircle, CheckCircle, Info, X, CheckCheck } from "lucide-react";
import { IconButton } from "@/components/admin/ui/admin-button";
import { AdminBadge } from "@/components/admin/ui/admin-badge";
import { SearchInput } from "@/components/admin/ui/admin-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useNotificationsContext } from "@/providers/notifications-provider";
import { type Notification } from "@/types/notification";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

// Breadcrumb labels mapping for admin routes
const breadcrumbLabels: Record<string, string> = {
  admin: "لوحة التحكم",
  users: "المستخدمين",
  analytics: "التقارير والتحليلات",
  subjects: "المواد الدراسية",
  books: "الكتب",
  exams: "الامتحانات",
  resources: "الموارد",
  challenges: "التحديات",
  achievements: "الإنجازات",
  rewards: "المكافآت",
  seasons: "المواسم",
  announcements: "الإعلانات",
  forum: "المنتدى",
  blog: "المدونة",
  events: "الأحداث",
  contests: "المسابقات",
  settings: "الإعدادات",
  "audit-logs": "سجل النظام",
};

const notificationIcons: Record<string, React.ElementType> = {
  user: Users,
  achievement: Trophy,
  system: Settings,
  warning: AlertCircle,
  success: CheckCircle,
  info: Info,
};

const notificationColors: Record<string, string> = {
  user: "text-blue-500 bg-blue-500/10",
  achievement: "text-yellow-500 bg-yellow-500/10",
  system: "text-purple-500 bg-purple-500/10",
  warning: "text-orange-500 bg-orange-500/10",
  success: "text-green-500 bg-green-500/10",
  info: "text-cyan-500 bg-cyan-500/10",
};

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    markAsRead: globalMarkAsRead,
    isLoading
  } = useNotificationsContext();

  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error("Logout failed:", error);
    }
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Generate breadcrumbs from pathname
  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];
    
    let currentPath = "";
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const label = breadcrumbLabels[segment];
      if (label) {
        crumbs.push({ label, href: currentPath });
      }
    }
    return crumbs;
  }, [pathname]);

  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "لوحة التحكم";

  const formatNotificationTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  const markAsRead = async (id: string) => {
    await globalMarkAsRead([id]);
  };

  const markAllAsRead = async () => {
    await globalMarkAsRead(undefined, true);
    toast.success("تم تحديد جميع الإشعارات كمقروءة");
  };

  const clearNotification = (id: string) => {
    // This could call a delete API if implemented
    toast.info("هذه الميزة ستتوفر قريباً");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-2 backdrop-blur-xl sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        {/* Mobile Menu Button */}
        <IconButton
          icon={Menu}
          label="القائمة"
          variant="ghost"
          className="lg:hidden"
          onClick={onMenuClick}
        />

        <div className="hidden min-w-0 md:block">
          <nav className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 && (
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
          </nav>
          <p className="mt-1 truncate text-sm font-black text-foreground">{pageTitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-2">
        {/* Search */}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="hidden md:flex relative group cursor-text"
        >
          <SearchInput
            placeholder="بحث سريع..."
            className="w-64 pointer-events-none group-hover:border-primary/50 transition-colors"
            readOnly
          />
          <kbd className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none hidden xl:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            Ctrl+K
          </kbd>
        </button>

        {/* Mobile search toggle */}
        <IconButton
          icon={Search}
          label="البحث"
          variant="ghost"
          className="md:hidden"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
        />

        {/* Theme Toggle */}
        <IconButton
          icon={!mounted ? Sun : (theme === "dark" ? Moon : Sun)}
          label="تبديل المظهر"
          variant="ghost"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        />

        {/* Notifications */}
        <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DropdownMenuTrigger asChild>
            <button className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -left-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-96 rounded-xl p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">الإشعارات</h3>
                {unreadCount > 0 && (
                  <AdminBadge variant="solid" color="blue" size="sm">
                    {unreadCount} جديد
                  </AdminBadge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  تحديد الكل كمقروء
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.map((notification) => {
                    const isRead = notification.isRead;
                    const Icon = notificationIcons[notification.type] || Bell;
                    const colorClass = notificationColors[notification.type] || "text-gray-500 bg-gray-500/10";
                    return (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!isRead ? "bg-primary/5" : ""}`}
                        onClick={() => {
                          markAsRead(notification.id);
                        }}
                      >
                        <div className={`flex-shrink-0 p-2 rounded-lg ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${!isRead ? "" : "text-muted-foreground"}`}>
                              {notification.title}
                            </span>
                            {!isRead && (
                              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {formatNotificationTime(new Date(notification.createdAt))}
                          </p>
                        </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t">
              <Link
                href="/admin/notifications"
                className="flex items-center justify-center text-sm text-primary hover:underline py-1"
              >
                عرض كل الإشعارات
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator */}
        <div className="hidden md:block h-6 w-px bg-border mx-1" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 sm:gap-2.5 h-9 rounded-lg px-1 sm:px-2 hover:bg-accent transition-colors">
                <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                  <AvatarImage src={user?.avatar || "/logo-tolo.jpg"} alt={user?.name || "Admin"} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold">
                    {user?.name?.[0] || user?.email?.[0] || "م"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-xs font-semibold leading-none">{user?.name || user?.username || "المدير"}</span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-0.5">مدير النظام</span>
                </div>
              </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{user?.name || user?.username || "المدير"}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.email || "admin@tolo.com"}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="cursor-pointer">
                <Settings className="ml-2 h-4 w-4" />
                الإعدادات
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/audit-logs" className="cursor-pointer">
                <Shield className="ml-2 h-4 w-4" />
                سجل النظام
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

