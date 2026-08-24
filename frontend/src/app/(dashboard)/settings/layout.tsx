'use client';

import { useAuth } from "@/hooks/use-auth";
/**
 * 🎨 Settings Layout - تخطيط صفحات الإعدادات
 *
 * Sidebar متحرك مع معلومات المستخدم، تنقل سلس مع مؤشر نشط، دعم RTL كامل،
 * وربط حقيقي مع بيانات المستخدم من قاعدة البيانات.
 *
 * يستخدم رموز التصميم الموحدة للموقع (bg-background / bg-card / text-foreground /
 * text-primary ...) بدلاً من ألوان ثابتة، حتى يستجيب لوضعي الفاتح والداكن
 * الحقيقيين بدل فرض مظهر داكن دائم.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { m, AnimatePresence } from "framer-motion";
import {
  Settings,
  User,
  Shield,
  Smartphone,
  Bell,
  Lock,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Sparkles,
  Loader2,
  Star,
  Flame,
  Trophy,
  AlertCircle,
  TrendingUp,
  Award,
} from 'lucide-react';
import { useGamification } from '@/hooks/use-gamification';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Settings;
  href: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  badgeVariant?: 'solid' | 'outline';
}

const navItems: NavItem[] = [
  {
    id: 'profile',
    label: 'الملف الشخصي',
    icon: User,
    href: '/settings',
    description: 'معلوماتك الشخصية وصورتك',
  },
  {
    id: 'security',
    label: 'الأمان',
    icon: Shield,
    href: '/settings/security',
    description: 'حماية حسابك وكلمات المرور',
    badge: 'مهم',
    badgeColor: 'bg-destructive',
    badgeVariant: 'solid',
  },
  {
    id: 'devices',
    label: 'الأجهزة',
    icon: Smartphone,
    href: '/settings/devices',
    description: 'إدارة الأجهزة المتصلة',
  },
  {
    id: 'notifications',
    label: 'الإشعارات',
    icon: Bell,
    href: '/settings/notifications',
    description: 'تخصيص التنبيهات والإشعارات',
  },
  {
    id: 'privacy',
    label: 'الخصوصية',
    icon: Lock,
    href: '/settings/privacy',
    description: 'خصوصية البيانات والمشاركة',
  },
  {
    id: 'progress',
    label: 'مستوى التقدم',
    icon: TrendingUp,
    href: '/settings/progress',
    description: 'متابعة نسبة إنجازك للمناهج التعليمية',
  },
  {
    id: 'achievements',
    label: 'الإنجازات والأوسمة',
    icon: Award,
    href: '/settings/achievements',
    description: 'الأوسمة والنقاط التي حصدتها خلال تعلمك',
  },
  {
    id: 'certificates',
    label: 'الشهادات',
    icon: Trophy,
    href: '/settings/certificates',
    description: 'عرض وتحميل شهادات إتمام الدورات',
  },
];

// Sidebar Content Component - Extracted to avoid re-creation during render
interface SidebarContentProps {
  mobile?: boolean;
  isSidebarOpen: boolean;
  user: {
    id?: string;
    name?: string;
    username?: string;
    email: string;
    avatar?: string;
    role: string;
    emailVerified?: boolean;
    totalXP?: number;
    level?: number;
    currentStreak?: number;
    phone?: string;
    school?: string;
    bio?: string;
  };
  currentItem: NavItem;
  onToggleSidebar: () => void;
  onCloseMobile: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}

function SidebarContent({
  mobile = false,
  isSidebarOpen,
  user,
  currentItem,
  onToggleSidebar,
  onCloseMobile,
  onLogout,
  isLoggingOut,
}: SidebarContentProps) {
  const isAdmin = user.role === 'ADMIN';
  const isTeacher = user.role === 'TEACHER';

  const userInitial = user.name
    ? user.name.charAt(0).toUpperCase()
    : user.email?.charAt(0)?.toUpperCase() || 'U';

  const profileCompletion = [
    user.name,
    user.email,
    user.phone,
    user.school || user.bio,
    user.avatar,
  ].filter(Boolean).length * 20;

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {(isSidebarOpen || mobile) && (
              <m.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
                  <Settings className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">الإعدادات</h2>
                  <p className="text-xs text-muted-foreground">تخصيص حسابك</p>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {!mobile && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              {isSidebarOpen ? (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          )}

          {mobile && (
            <button
              onClick={onCloseMobile}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* User Profile Card */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || mobile) && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-b border-border"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary via-primary/70 to-accent p-0.5 shadow-lg shadow-primary/20">
                  <div className="h-full w-full rounded-[9px] bg-card overflow-hidden flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-foreground font-bold text-sm">{userInitial}</span>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">
                  {user.name || user.username || user.email?.split('@')[0] || 'U'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      'px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border-0',
                      isAdmin
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : isTeacher
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                          : 'bg-primary/15 text-primary'
                    )}
                  >
                    {isAdmin ? 'مدير' : isTeacher ? 'مدرس' : 'طالب'}
                  </Badge>
                  {!user.emailVerified && (
                    <Badge
                      variant="outline"
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border-0"
                    >
                      <AlertCircle className="h-2.5 w-2.5" />
                      غير مفعّل
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">اكتمال الملف</span>
                <span className="text-[10px] font-bold text-primary">{profileCompletion}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <m.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs font-bold text-foreground">{user.totalXP || 0}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">XP</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-3 w-3 text-primary" />
                  <span className="text-xs font-bold text-foreground">{user.level || 1}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">مستوى</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span className="text-xs font-bold text-foreground">{user.currentStreak || 0}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">يوم</p>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.id === currentItem.id;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => mobile && onCloseMobile()}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-l from-primary/15 to-accent/15 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {isActive && (
                <m.div
                  layoutId="activeTab"
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full bg-gradient-to-b from-primary to-accent"
                />
              )}

              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary shadow-lg shadow-primary/10'
                    : 'bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <AnimatePresence mode="wait">
                {(isSidebarOpen || mobile) && (
                  <m.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 text-[9px] rounded-full text-primary-foreground font-bold',
                            item.badgeColor
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                  </m.div>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          disabled={isLoggingOut}
          className={cn(
            'w-full group relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200',
            'text-destructive hover:bg-destructive/10 disabled:opacity-60'
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 transition-colors group-hover:bg-destructive/20">
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
          </div>
          <AnimatePresence mode="wait">
            {(isSidebarOpen || mobile) && (
              <m.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <span className="font-medium whitespace-nowrap">تسجيل الخروج</span>
                <p className="text-xs text-destructive/70 mt-0.5">إنهاء الجلسة الحالية</p>
              </m.div>
            )}
          </AnimatePresence>
        </button>
      </nav>

      {/* Sidebar Footer - Tips */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || mobile) && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-t border-border"
          >
            {!user.emailVerified ? (
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-300">تفعيل الحساب</span>
                </div>
                <p className="text-[10px] text-orange-600/70 dark:text-orange-400/70 leading-relaxed">
                  لم يتم تفعيل بريدك الإلكتروني بعد. تحقق من بريدك لتفعيل الحساب.
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">نصيحة أمنية</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  فعّل التحقق بخطوتين لحماية حسابك بشكل أفضل.
                </p>
                <Link
                  href="/settings/security"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  الذهاب للأمان
                  <ChevronLeft className="h-3 w-3" />
                </Link>
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const { userProgress } = useGamification({ userId: user?.id || "" });

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout]);

  // Collapse the desktop sidebar's expanded state when the viewport narrows
  // below the `lg` breakpoint — the desktop/mobile layout switch itself is
  // handled purely by CSS (`hidden lg:flex` / `lg:hidden`) below, so there is
  // no JS-driven remount and no hydration flash.
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Auth guard with improved stability
  useEffect(() => {
    // Only proceed if loading is finished
    if (isLoading) return;

    // If no user found after loading, redirect to login
    if (!user) {
      const redirectTarget = pathname || '/settings';

      // Prevent infinite redirect if we're already on a path that should be public (though settings shouldn't be)
      if (pathname === '/login' || pathname === '/register') return;

      router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Settings className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const getCurrentNavItem = () => {
    if (pathname === '/settings') return navItems[0];
    return (
      navItems.find(
        (item) => pathname.startsWith(item.href) && item.href !== '/settings'
      ) || navItems[0]
    );
  };

  const currentItem = getCurrentNavItem();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Mobile Header — CSS-only responsive (hidden lg:hidden), not JS-conditional,
          so there is no SSR->client hydration flash of the desktop sidebar on mobile. */}
      <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between p-4 bg-card/80 backdrop-blur-xl border-b border-border">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            {currentItem?.icon && <currentItem.icon className="h-4 w-4 text-primary-foreground" />}
          </div>
          <span className="font-semibold text-foreground">{currentItem?.label || 'الإعدادات'}</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex">
        {/* Desktop Sidebar — CSS-only responsive (hidden lg:flex) */}
        <m.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 300 : 80 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="hidden lg:flex sticky top-0 h-screen bg-card/60 backdrop-blur-md border-l border-border flex-col overflow-hidden"
        >
          <SidebarContent
            isSidebarOpen={isSidebarOpen}
            user={{
              ...user,
              name: user.name ?? undefined,
              username: user.username ?? undefined,
              avatar: user.avatar ?? undefined,
              phone: user.phone ?? undefined,
              school: user.school ?? undefined,
              bio: user.bio ?? undefined,
              emailVerified: user.emailVerified ?? undefined,
              totalXP: userProgress?.totalXP || 0,
              level: userProgress?.level || 1,
              currentStreak: userProgress?.currentStreak || 0
            }}
            currentItem={currentItem!}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        </m.aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
              <m.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-card border-l border-border flex flex-col"
              >
                <SidebarContent
                  mobile
                  isSidebarOpen={isSidebarOpen}
                  user={{
                    ...user,
                    name: user.name ?? undefined,
                    username: user.username ?? undefined,
                    avatar: user.avatar ?? undefined,
                    phone: user.phone ?? undefined,
                    school: user.school ?? undefined,
                    bio: user.bio ?? undefined,
                    emailVerified: user.emailVerified ?? undefined,
                    totalXP: userProgress?.totalXP || 0,
                    level: userProgress?.level || 1,
                    currentStreak: userProgress?.currentStreak || 0
                  }}
                  currentItem={currentItem!}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onCloseMobile={() => setIsMobileSidebarOpen(false)}
                  onLogout={handleLogout}
                  isLoggingOut={isLoggingOut}
                />
              </m.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
