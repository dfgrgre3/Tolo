'use client';

/**
 * 🎨 Settings Layout - تخطيط صفحات الإعدادات
 * 
 * تصميم حديث مع:
 * - Sidebar متحرك
 * - تنقل سلس
 * - دعم RTL
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

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

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
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isLoading || user) {
      return;
    }

    const redirectTarget = pathname || '/settings';
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [isLoading, user, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Get current nav item
  const getCurrentNavItem = () => {
    if (pathname === '/settings') return navItems[0];
    return navItems.find(item => pathname.startsWith(item.href) && item.href !== '/settings') || navItems[0];
  };

  const currentItem = getCurrentNavItem();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
            <Settings className="h-5 w-5 text-indigo-400" />
            <span className="font-semibold text-white">الإعدادات</span>
          </div>
          <div className="w-9" />
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <motion.aside
            initial={false}
            animate={{ width: isSidebarOpen ? 280 : 80 }}
            className="sticky top-0 h-screen bg-slate-900/50 backdrop-blur-xl border-l border-white/10 flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                        <Settings className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-white">الإعدادات</h2>
                        <p className="text-xs text-slate-400">تخصيص حسابك</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = item.id === currentItem.id;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
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
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full bg-indigo-500"
                      />
                    )}

                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <AnimatePresence mode="wait">
                      {isSidebarOpen && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex-1 min-w-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{item.label}</span>
                            {item.badge && (
                              <span className={cn('px-1.5 py-0.5 text-[10px] rounded-full text-white', item.badgeColor)}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{item.description}</p>
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
                  {isSidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                    >
                      <span className="font-medium whitespace-nowrap">تسجيل الخروج</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </nav>


            {/* Sidebar Footer */}
            <AnimatePresence mode="wait">
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 border-t border-white/10"
                >
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <span className="text-sm font-medium text-white">نصائح</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      فعّل التحقق بخطوتين لحماية حسابك بشكل أفضل
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                {/* Mobile Sidebar Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white">الإعدادات</h2>
                      <p className="text-xs text-slate-400">تخصيص حسابك</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                {/* Mobile Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = item.id === currentItem.id;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-l from-indigo-500/20 to-purple-500/20 text-white'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                            isActive
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'bg-white/5 text-slate-400'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.label}</span>
                            {item.badge && (
                              <span className={cn('px-1.5 py-0.5 text-[10px] rounded-full text-white', item.badgeColor)}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{item.description}</p>
                        </div>
                      </Link>
                    );
                  })}

                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-3 rounded-xl p-3 transition-all duration-200 text-red-400 hover:bg-red-500/10 disabled:opacity-60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                      {isLoggingOut ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <LogOut className="h-5 w-5" />
                      )}
                    </div>
                    <span className="font-medium">تسجيل الخروج</span>
                  </button>
                </nav>

              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
