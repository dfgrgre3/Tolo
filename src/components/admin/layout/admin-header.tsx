"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Menu, LogOut, Moon, Sun, ChevronLeft, Home, Settings, Shield, Users, Trophy, AlertCircle, CheckCircle, Info, X, CheckCheck } from "lucide-react";
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

interface Notification {
  id: string;
  type: "user" | "achievement" | "system" | "warning" | "success" | "info";
  title: string;
  message: string;
  time: Date;
  read: boolean;
  actionUrl?: string;
}

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
  const [notifications, setNotifications] = React.useState<Notification[]>([
    { id: "1", type: "user", title: "مستخدم جديد", message: "تم تسجيل مستخدم جديد في النظام", time: new Date(Date.now() - 5 * 60 * 1000), read: false },
    { id: "2", type: "achievement", title: "إنجاز جديد", message: "تم فتح إنجاز جديد: الطالب المثالي", time: new Date(Date.now() - 15 * 60 * 1000), read: false },
    { id: "3", type: "system", title: "تحديث النظام", message: "تم تحديث النظام بنجاح إلى الإصدار 2.0", time: new Date(Date.now() - 60 * 60 * 1000), read: true },
    { id: "4", type: "warning", title: "تحذير", message: "اقتراب مساحة التخزين من الحد الأقصى", time: new Date(Date.now() - 2 * 60 * 60 * 1000), read: true },
    { id: "5", type: "success", title: "نجاح", message: "تم إرسال الإشعارات بنجاح", time: new Date(Date.now() - 3 * 60 * 60 * 1000), read: true },
  ]);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("تم تحديد جميع الإشعارات كمقروءة");
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-xl px-2 sm:px-4 lg:px-6">
      {/* Left side: Menu + Breadcrumbs */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Mobile Menu Button */}
        <IconButton
          icon={Menu}
          label="القائمة"
          variant="ghost"
          className="lg:hidden"
          onClick={onMenuClick}
        />

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm">
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
      </div>

      {/* Right Side */}
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
                  const type = (notification.type || "info").toLowerCase();
                  const Icon = notificationIcons[type] || Info;
                  const colorClass = notificationColors[type] || notificationColors.info;
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.read ? "bg-primary/5" : ""}`}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl;
                        }
                      }}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-lg ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${!notification.read ? "" : "text-muted-foreground"}`}>
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatNotificationTime(notification.time)}
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
                <AvatarImage src="/admin-avatar.png" alt="Admin" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold">
                  م
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-xs font-semibold leading-none">المدير</span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">مدير النظام</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">المدير</span>
                <span className="text-xs text-muted-foreground font-normal">admin@tolo.com</span>
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
            <DropdownMenuItem className="text-destructive cursor-pointer">
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

