"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePermission } from "@/components/auth/PermissionGuard";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Trophy,
  Bell,
  MessageSquare,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  Gift,
  Target,
  Award,
  Crown,
  Newspaper,
  Gamepad2,
  BarChart3,
  Monitor,
  ScrollText,
  Sparkles,
  Home,
  GraduationCap,
  Search,
  Keyboard,
  Plus,
  Star,
  StarOff,
  Zap,
  UserPlus,
  FilePlus,
  Bookmark,
  Bot,
  Radio,
  TableProperties,
  Send,
  Split,
  Workflow,
  PlayCircle,
  ShieldCheck,
  Lock
} from "lucide-react";
import { IconButton, AdminButton } from "@/components/admin/ui/admin-button";
import { SearchInput } from "@/components/admin/ui/admin-input";
import { AdminBadge } from "@/components/admin/ui/admin-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SidebarNavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  color?: string;
  permission?: string;
}

interface QuickAction {
  title: string;
  href: string;
  icon: React.ElementType;
  color: string;
  permission?: string;
}

interface BookmarkItem {
  id: string;
  title: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarNavLinkProps {
  item: SidebarNavItem;
  pathname: string | null;
  collapsed: boolean;
}

interface SidebarNavSectionProps {
  title: string;
  items: SidebarNavItem[];
  pathname: string | null;
  collapsed: boolean;
}

const mainNavItems: SidebarNavItem[] = [
  {
    title: "لوحة المعلومات",
    href: "/admin",
    icon: LayoutDashboard,
    color: "bg-blue-500",
    permission: "DASHBOARD_VIEW",
  },
  {
    title: "المستخدمين",
    href: "/admin/users",
    icon: Users,
    color: "bg-violet-500",
    permission: "USERS_VIEW",
  },
  {
    title: "مصفوفة الصلاحيات",
    href: "/admin/users/permissions",
    icon: ShieldCheck,
    color: "bg-amber-500",
    permission: "USERS_MANAGE",
  },
  {
    title: "المعلمين",
    href: "/admin/teachers",
    icon: GraduationCap,
    color: "bg-indigo-500",
    permission: "TEACHERS_VIEW",
  },
  {
    title: "عمليات المراقبة اللحظية",
    href: "/admin/live",
    icon: Radio,
    color: "bg-red-500",
    permission: "LIVE_MONITOR_VIEW",
  },
  {
    title: "التقارير والتحليلات",
    href: "/admin/analytics",
    icon: BarChart3,
    color: "bg-emerald-500",
    permission: "ANALYTICS_VIEW",
  },
  {
    title: "مُنشئ التقارير (الخزانة)",
    href: "/admin/reports",
    icon: TableProperties,
    color: "bg-orange-500",
    permission: "REPORTS_VIEW",
  },
];

const contentNavItems: SidebarNavItem[] = [
  {
    title: "الدورات التعليمية",
    href: "/admin/courses",
    icon: PlayCircle,
    color: "bg-blue-600",
    permission: "SUBJECTS_VIEW",
  },
  {
    title: "تصنيفات الدورات",
    href: "/admin/course-categories",
    icon: Bookmark,
    color: "bg-cyan-600",
    permission: "SUBJECTS_VIEW",
  },
  {
    title: "المواد الدراسية",
    href: "/admin/subjects",
    icon: BookOpen,
    color: "bg-blue-500",
    permission: "SUBJECTS_VIEW",
  },
  {
    title: "الكتب",
    href: "/admin/books",
    icon: FileText,
    color: "bg-amber-500",
    permission: "BOOKS_VIEW",
  },
  {
    title: "الامتحانات",
    href: "/admin/exams",
    icon: Target,
    color: "bg-green-500",
    permission: "EXAMS_VIEW",
  },
  {
    title: "الموارد",
    href: "/admin/resources",
    icon: Gift,
    color: "bg-pink-500",
    permission: "RESOURCES_VIEW",
  },
  {
    title: "AI Command Center",
    href: "/admin/ai",
    icon: Bot,
    color: "bg-red-500",
    permission: "AI_MANAGE",
  },
];

const gamificationNavItems: SidebarNavItem[] = [
  {
    title: "التحديات",
    href: "/admin/challenges",
    icon: Trophy,
    color: "bg-orange-500",
    permission: "CHALLENGES_VIEW",
  },
  {
    title: "الإنجازات",
    href: "/admin/achievements",
    icon: Award,
    color: "bg-yellow-500",
    permission: "ACHIEVEMENTS_VIEW",
  },
  {
    title: "المكافآت",
    href: "/admin/rewards",
    icon: Gift,
    color: "bg-fuchsia-500",
    permission: "REWARDS_VIEW",
  },
  {
    title: "المواسم",
    href: "/admin/seasons",
    icon: Crown,
    color: "bg-purple-500",
    permission: "SEASONS_VIEW",
  },
  {
    title: "محرك القواعد (الأتمتة)",
    href: "/admin/automations",
    icon: Workflow,
    color: "bg-blue-500",
    permission: "AI_MANAGE",
  },
  {
    title: "حملات الغنائم (CRM)",
    href: "/admin/marketing",
    icon: Send,
    color: "bg-pink-500",
    permission: "MARKETING_VIEW",
  },
  {
    title: "اختبارات النمو A/B",
    href: "/admin/ab-testing",
    icon: Split,
    color: "bg-teal-500",
    permission: "AB_TESTING_VIEW",
  },
];

const communityNavItems: SidebarNavItem[] = [
  {
    title: "الإعلانات",
    href: "/admin/announcements",
    icon: Bell,
    color: "bg-sky-500",
    permission: "ANNOUNCEMENTS_VIEW",
  },
  {
    title: "المنتدى",
    href: "/admin/forum",
    icon: MessageSquare,
    color: "bg-teal-500",
    permission: "FORUM_VIEW",
  },
  {
    title: "المدونة",
    href: "/admin/blog",
    icon: Newspaper,
    color: "bg-indigo-500",
    permission: "BLOG_VIEW",
  },
  {
    title: "الأحداث",
    href: "/admin/events",
    icon: Calendar,
    color: "bg-lime-500",
    permission: "EVENTS_VIEW",
  },
  {
    title: "المسابقات",
    href: "/admin/contests",
    icon: Gamepad2,
    color: "bg-red-500",
    permission: "CONTESTS_VIEW",
  },
];

const infrastructureNavItems: SidebarNavItem[] = [
  {
    title: "مراقبة البنية التحتية",
    href: "/admin/infrastructure",
    icon: Monitor,
    color: "bg-blue-600",
    permission: "SETTINGS_MANAGE",
  },
  {
    title: "تقسيم البيانات (Scalability)",
    href: "/admin/infrastructure/partitions",
    icon: Split,
    color: "bg-indigo-600",
    permission: "SETTINGS_MANAGE",
  },
  {
    title: "سجلات النظام (Engine)",
    href: "/admin/audit-logs",
    icon: ScrollText,
    color: "bg-slate-500",
    permission: "AUDIT_LOGS_VIEW",
  }
];

const quickActions: QuickAction[] = [
  { title: "إضافة مستخدم", href: "/admin/users/new", icon: UserPlus, color: "blue", permission: "USERS_MANAGE" },
  { title: "إضافة محتوى", href: "/admin/subjects/new", icon: FilePlus, color: "green", permission: "SUBJECTS_MANAGE" },
  { title: "إضافة تحدي", href: "/admin/challenges/new", icon: Trophy, color: "orange", permission: "CHALLENGES_MANAGE" },
  { title: "الذكاء الاستراتيجي", href: "/admin/ai", icon: Bot, color: "red", permission: "AI_MANAGE" },
  { title: "إرسال إعلان", href: "/admin/announcements/new", icon: Bell, color: "purple", permission: "ANNOUNCEMENTS_MANAGE" },
];

function SidebarNavLink({ item, pathname, collapsed }: SidebarNavLinkProps) {
  const isActive = pathname === item.href;
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {isActive && (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full bg-primary" />
      )}

      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0",
          isActive
            ? "bg-white/20"
            : "bg-muted/50 group-hover:bg-gradient-to-br group-hover:text-white",
          !isActive && item.color
        )}
      >
        <Icon
          className={cn(
            "h-4.5 w-4.5 transition-transform duration-200",
            "group-hover:scale-110"
          )}
        />
      </div>

      {!collapsed && <span className="truncate">{item.title}</span>}

      {!collapsed && item.badge && (
        <span className="mr-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
          {item.badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
}

function SidebarNavSection({
  title,
  items,
  pathname,
  collapsed,
}: SidebarNavSectionProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {!collapsed && (
        <h3 className="px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {title}
        </h3>
      )}
      {collapsed && <div className="mx-3 my-2 h-px bg-border/50" />}
      <nav className="space-y-0.5">
        {items.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const { user } = useAuth();
  const { hasPermission } = usePermission();

  const filterByPermission = (items: SidebarNavItem[]) => 
    items.filter(item => !item.permission || hasPermission(item.permission as any));

  const filteredMainNav = filterByPermission(mainNavItems);
  const filteredContentNav = filterByPermission(contentNavItems);
  const filteredGamificationNav = filterByPermission(gamificationNavItems);
  const filteredCommunityNav = filterByPermission(communityNavItems);
  const filteredInfrastructureNav = filterByPermission(infrastructureNavItems);
  const filteredQuickActions = quickActions.filter(action => !action.permission || hasPermission(action.permission as any));

  const [bookmarks, setBookmarks] = React.useState<BookmarkItem[]>([]);

  const removeBookmark = (id: string) => {
    const bookmark = bookmarks.find(b => b.id === id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
    if (bookmark) {
      toast.success(`تمت إزالة "${bookmark.title}" من المفضلة`);
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShortcutsOpen(false);
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) setShortcutsOpen(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-l bg-card/80 backdrop-blur-xl transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-3">
        {!collapsed && (
          <div className="flex items-center gap-2.5 pr-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden bg-white border border-primary/20 shadow-lg shadow-primary/10">
              <Image 
                src="/logo-tolo.jpg" 
                alt="TOLO" 
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-foreground">لوحة التحكم</span>
              <p className="text-[10px] text-muted-foreground font-medium">إدارة الموقع</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          {!collapsed && (
            <IconButton
              icon={Search}
              label="البحث"
              variant="ghost"
              onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            />
          )}
          <IconButton
            icon={collapsed ? ChevronLeft : ChevronRight}
            label={collapsed ? "توسيع" : "طي"}
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            className={collapsed ? "mx-auto" : ""}
          />
        </div>
      </div>

      {/* Quick Actions */}
      {!collapsed && filteredQuickActions.length > 0 && (
        <div className="px-3 py-2 border-b">
          <h3 className="px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            إجراءات سريعة
          </h3>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {filteredQuickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Icon className={cn(
                    "h-3.5 w-3.5",
                    action.color === "blue" && "text-blue-500",
                    action.color === "green" && "text-green-500",
                    action.color === "orange" && "text-orange-500",
                    action.color === "purple" && "text-purple-500"
                  )} />
                  <span className="truncate">{action.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bookmarks */}
      {!collapsed && bookmarks.length > 0 && (
        <div className="px-3 py-2 border-b">
          <h3 className="px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
            <Star className="h-3 w-3" />
            المفضلة
          </h3>
          <nav className="space-y-0.5 mt-1">
            {bookmarks.map((bookmark) => {
              const Icon = bookmark.icon;
              const isActive = pathname === bookmark.href;
              return (
                <div
                  key={bookmark.id}
                  className="group flex items-center"
                >
                  <Link
                    href={bookmark.href}
                    className={cn(
                      "flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="truncate">{bookmark.title}</span>
                  </Link>
                  <button
                    onClick={() => removeBookmark(bookmark.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
                  >
                    <StarOff className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        <SidebarNavSection title="الرئيسية" items={filteredMainNav} pathname={pathname} collapsed={collapsed} />
        <SidebarNavSection title="المحتوى التعليمي" items={filteredContentNav} pathname={pathname} collapsed={collapsed} />
        <SidebarNavSection title="التحديات والمكافآت" items={filteredGamificationNav} pathname={pathname} collapsed={collapsed} />
        <SidebarNavSection title="المجتمع" items={filteredCommunityNav} pathname={pathname} collapsed={collapsed} />
        <SidebarNavSection title="البنية التحتية" items={filteredInfrastructureNav} pathname={pathname} collapsed={collapsed} />
      </div>

      {/* Footer */}
      <div className="border-t p-3 space-y-0.5">
        <SidebarNavLink
          item={{
            title: "سجل النظام",
            href: "/admin/audit-logs",
            icon: ScrollText,
            color: "bg-slate-500",
            permission: "AUDIT_LOGS_VIEW",
          }}
          pathname={pathname}
          collapsed={collapsed}
        />
        <SidebarNavLink
          item={{
            title: "الإعدادات",
            href: "/admin/settings",
            icon: Settings,
            color: "bg-gray-500",
            permission: "SETTINGS_MANAGE",
          }}
          pathname={pathname}
          collapsed={collapsed}
        />
        
        {!collapsed && (
          <button
            onClick={() => setShortcutsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
              <Keyboard className="h-4 w-4" />
            </div>
            <span>اختصارات لوحة المفاتيح</span>
          </button>
        )}
        
        <div className={cn("pt-2 mt-2 border-t", collapsed && "px-0")}>
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                <Home className="h-4.5 w-4.5" />
              </div>
              {!collapsed && <span>العودة للموقع</span>}
            </Link>
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              اختصارات لوحة المفاتيح
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { keys: ["Ctrl", "K"], action: "البحث السريع" },
              { keys: ["?"], action: "عرض الاختصارات" },
              { keys: ["Esc"], action: "إغلاق النوافذ" },
              { keys: ["Ctrl", "S"], action: "حفظ (في النماذج)" },
            ].map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{shortcut.action}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <kbd key={j} className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                       {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
