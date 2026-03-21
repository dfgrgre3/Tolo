'use client';

/**
 * 🎨 Settings Layout - تخطيط صفحات الإعدادات (محدّث بالكامل)
 *
 * تصميم متطور مع:
 * - Sidebar متحرك مع معلومات المستخدم
 * - تنقل سلس مع مؤشر نشط
 * - دعم RTL كامل
 * - ربط حقيقي مع بيانات المستخدم من قاعدة البيانات
 */

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Shield,
  Smartphone,
  Bell,
  Palette,
  Globe,
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
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

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
    badgeColor: 'bg-red-500',
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
    id: 'appearance',
    label: 'المظهر',
    icon: Palette,
    href: '/settings/appearance',
    description: 'السمات والألوان وحجم الخط',
  },
  {
    id: 'language',
    label: 'اللغة والمنطقة',
    icon: Globe,
    href: '/settings/language',
    description: 'اللغة والتوقيت والتنسيق',
  },
  {
    id: 'privacy',
    label: 'الخصوصية',
    icon: Lock,
    href: '/settings/privacy',
    description: 'خصوصية البيانات والمشاركة',
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileNow = window.innerWidth < 1024;
      setIsMobile(isMobileNow);
      if (isMobileNow) setIsSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auth guard
  useEffect(() => {
    if (isLoading || user) return;
    const redirectTarget = pathname || '/settings';
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [isLoading, user, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Settings className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium">جاري التحميل...</p>
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
  const isTeacher = user.role === 'TEACHER';
  const isAdmin = user.role === 'ADMIN';

  // User avatar / initials
  const userInitial = user.name
    ? user.name.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  const profileCompletion = [
    user.name,
    user.email,
    user.phone,
    (user as any).school || (user as any).bio,
    user.avatar,
  ].filter(Boolean).length * 20; // 0-100

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {(isSidebarOpen || mobile) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white">الإعدادات</h2>
                  <p className="text-xs text-slate-400">تخصيص حسابك</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!mobile && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isSidebarOpen ? (
                <ChevronRight className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-slate-400" />
              )}
            </button>
          )}

          {mobile && (
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* User Profile Card */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || mobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-b border-white/10"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
                  <div className="h-full w-full rounded-[9px] bg-slate-900 overflow-hidden flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">{userInitial}</span>
                    )}
                  </div>
                </div>
                {/* Online dot */}
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-slate-900" />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">
                  {user.name || user.username || user.email.split('@')[0]}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      'inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider',
                      isAdmin
                        ? 'bg-amber-500/20 text-amber-400'
                        : isTeacher
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    )}
                  >
                    {isAdmin ? 'مدير' : isTeacher ? 'مدرس' : 'طالب'}
                  </span>
                  {!user.emailVerified && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/20 text-orange-400">
                      <AlertCircle className="h-2.5 w-2.5" />
                      غير مفعّل
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-500 font-medium">اكتمال الملف</span>
                <span className="text-[10px] font-bold text-indigo-400">{profileCompletion}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="text-center p-2 rounded-lg bg-white/5">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400" />
                  <span className="text-xs font-bold text-white">{user.totalXP || 0}</span>
                </div>
                <p className="text-[9px] text-slate-500 mt-0.5">XP</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/5">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-3 w-3 text-indigo-400" />
                  <span className="text-xs font-bold text-white">{user.level || 1}</span>
                </div>
                <p className="text-[9px] text-slate-500 mt-0.5">مستوى</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/5">
                <div className="flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3 text-orange-400" />
                  <span className="text-xs font-bold text-white">{user.currentStreak || 0}</span>
                </div>
                <p className="text-[9px] text-slate-500 mt-0.5">يوم</p>
              </div>
            </div>
          </motion.div>
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
              onClick={() => mobile && setIsMobileSidebarOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-l from-indigo-500/20 to-purple-500/20 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full bg-gradient-to-b from-indigo-400 to-purple-500"
                />
              )}

              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <AnimatePresence mode="wait">
                {(isSidebarOpen || mobile) && (
                  <motion.div
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
                            'px-1.5 py-0.5 text-[9px] rounded-full text-white font-bold',
                            item.badgeColor
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            'w-full group relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200',
            'text-red-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60'
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 transition-colors group-hover:bg-red-500/20">
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
          </div>
          <AnimatePresence mode="wait">
            {(isSidebarOpen || mobile) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <span className="font-medium whitespace-nowrap">تسجيل الخروج</span>
                <p className="text-xs text-red-400/60 mt-0.5">إنهاء الجلسة الحالية</p>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </nav>

      {/* Sidebar Footer - Tips */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || mobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-t border-white/10"
          >
            {!user.emailVerified ? (
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-bold text-orange-300">تفعيل الحساب</span>
                </div>
                <p className="text-[10px] text-orange-400/70 leading-relaxed">
                  لم يتم تفعيل بريدك الإلكتروني بعد. تحقق من بريدك لتفعيل الحساب.
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">نصيحة أمنية</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  فعّل التحقق بخطوتين لحماية حسابك بشكل أفضل.
                </p>
                <Link
                  href="/settings/security"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                >
                  الذهاب للأمان
                  <ChevronLeft className="h-3 w-3" />
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" dir="rtl">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Menu className="h-5 w-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              {currentItem?.icon && <currentItem.icon className="h-4 w-4 text-white" />}
            </div>
            <span className="font-semibold text-white">{currentItem?.label || 'الإعدادات'}</span>
          </div>
          <div className="w-9" />
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <motion.aside
            initial={false}
            animate={{ width: isSidebarOpen ? 300 : 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="sticky top-0 h-screen bg-slate-900/50 backdrop-blur-xl border-l border-white/10 flex flex-col overflow-hidden"
          >
            <SidebarContent />
          </motion.aside>
        )}

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobile && isMobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-slate-900 border-l border-white/10 flex flex-col"
              >
                <SidebarContent mobile />
              </motion.aside>
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
