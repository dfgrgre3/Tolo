"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/shared/button';
import { Badge } from '@/shared/badge';
import { Input } from '@/components/ui/input';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/shared/navigation-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  Bell,
  Settings,
  User,
  LogOut,
  LayoutDashboard,
  GraduationCap,
  Target,
  Users,
  Sparkles,
  ShieldCheck,
  BookOpen,
  PenTool,
  Library,
  FileText,
  Clock,
  CalendarDays,
  BarChart3,
  MessageSquare,
  Trophy,
  Megaphone,
  Lightbulb,
  PlusCircle,
  Timer,
  Search,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderDesktopProps {
  pathname: string;
  user: any;
  isAuthenticated: boolean;
}

type NavigationSectionKey =
  | 'dashboard'
  | 'learning'
  | 'productivity'
  | 'community'
  | 'ai'
  | 'account';

interface NavigationItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

interface NavigationSection {
  key: NavigationSectionKey;
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  items?: NavigationItem[];
  highlightPaths?: string[];
}

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

const toTitleCase = (value: string) =>
  value
    .split('-')
    .map((segment) =>
      segment.length > 0
        ? segment.charAt(0).toUpperCase() + segment.slice(1)
        : segment,
    )
    .join(' ');

const segmentLabels: Record<string, string> = {
  home: 'الرئيسية',
  dashboard: 'لوحة التحكم',
  analytics: 'التحليلات',
  achievements: 'الإنجازات',
  ai: 'الذكاء الاصطناعي',
  exam: 'تحليل الاختبارات',
  tips: 'نصائح دراسية',
  learning: 'التعلم',
  courses: 'الدروس',
  exams: 'الاختبارات',
  resources: 'الموارد',
  library: 'المكتبة',
  teachers: 'المعلمون',
  'teacher-exams': 'اختبارات المعلمين',
  productivity: 'الإنتاجية',
  time: 'إدارة الوقت',
  schedule: 'الجدول الدراسي',
  tasks: 'المهام',
  progress: 'التقدم',
  goals: 'الأهداف',
  community: 'المجتمع',
  notifications: 'التنبيهات',
  forum: 'المنتدى',
  events: 'الفعاليات',
  announcements: 'الإعلانات',
  chat: 'المحادثات',
  account: 'الحساب',
  profile: 'الملف الشخصي',
  settings: 'الإعدادات',
  security: 'الأمان',
  language: 'اللغة',
  appearance: 'المظهر',
  leaderboard: 'لوحة الصدارة',
  blog: 'المدونة',
  contests: 'المسابقات',
  'page-enhanced': 'النسخة المحسّنة',
  'page-new': 'نسخة جديدة',
  'page-advanced': 'الوضع المتقدم',
};

const navigationSections: NavigationSection[] = [
  {
    key: 'dashboard',
    title: 'لوحة التحكم',
    description: 'نظرة شاملة على يومك الدراسي وروابط سريعة لأهم الأقسام.',
    icon: LayoutDashboard,
    href: '/',
    highlightPaths: ['/page-enhanced'],
    items: [
      {
        title: 'الرئيسية',
        description: 'واجهة مخصصة تلخص تقدمك ومهامك الحالية.',
        href: '/',
        icon: LayoutDashboard,
      },
      {
        title: 'التجربة المتقدمة',
        description: 'اكتشف الواجهة المحسّنة مع عناصر تفاعلية إضافية.',
        href: '/page-enhanced',
        icon: Sparkles,
      },
      {
        title: 'التحليلات',
        description: 'لوحات بيانية متقدمة لمتابعة الأداء أسبوعياً.',
        href: '/analytics',
        icon: BarChart3,
      },
    ],
  },
  {
    key: 'learning',
    title: 'التعلم والمحتوى',
    description: 'كل الموارد التعليمية والدروس والاختبارات في مكان واحد.',
    icon: GraduationCap,
    highlightPaths: ['/library', '/teacher-exams', '/teachers'],
    items: [
      {
        title: 'الدروس التفاعلية',
        description: 'مسارات تعليمية مصممة حسب مستواك الدراسي.',
        href: '/courses',
        icon: BookOpen,
      },
      {
        title: 'الاختبارات الشاملة',
        description: 'نماذج امتحانات تدريبية مع نتائج فورية.',
        href: '/exams',
        icon: PenTool,
      },
      {
        title: 'الموارد الدراسية',
        description: 'ملفات وأوراق مراجعة لتدعيم عملية التعلم.',
        href: '/resources',
        icon: Library,
      },
      {
        title: 'مكتبة الوسائط',
        description: 'مراجع إضافية وكتب رقمية لجميع المواد.',
        href: '/library',
        icon: FileText,
      },
      {
        title: 'مجتمع المعلمين',
        description: 'تقييمات المعلمين واختبارات خاصة بهم.',
        href: '/teacher-exams',
        icon: Users,
      },
    ],
  },
  {
    key: 'productivity',
    title: 'التخطيط والإنتاجية',
    description: 'أدوات تساعدك على تنظيم الوقت والمهام ومتابعة التقدم.',
    icon: Target,
    highlightPaths: ['/goals', '/analytics'],
    items: [
      {
        title: 'إدارة المهام',
        description: 'تنظيم قائمة المهام مع تصنيفات وفلترة ذكية.',
        href: '/tasks',
        icon: FileText,
      },
      {
        title: 'متابعة الوقت',
        description: 'جلسات دراسة مركزة مع مؤقتات وتنبيهات.',
        href: '/time',
        icon: Clock,
      },
      {
        title: 'الجدول الدراسي',
        description: 'خطط أسبوعية مرنة وتكامل مع التذكيرات.',
        href: '/schedule',
        icon: CalendarDays,
      },
      {
        title: 'قياس التقدم',
        description: 'مؤشرات وإنجازات تساعدك على تحسين الأداء.',
        href: '/progress',
        icon: BarChart3,
      },
      {
        title: 'أهدافك الذكية',
        description: 'حدد أهدافاً قصيرة وطويلة المدى وتابعها.',
        href: '/goals',
        icon: Target,
      },
    ],
  },
  {
    key: 'community',
    title: 'المجتمع والتفاعل',
    description: 'ابقَ على تواصل مع الزملاء والفعاليات والتحديثات.',
    icon: Users,
    highlightPaths: ['/announcements', '/chat'],
    items: [
      {
        title: 'التنبيهات الذكية',
        description: 'إشعارات النظام وتذكيرات المواعيد الهامة.',
        href: '/notifications',
        icon: Bell,
      },
      {
        title: 'منتدى النقاش',
        description: 'شارك الأسئلة والأفكار مع مجتمع الدراسة.',
        href: '/forum',
        icon: MessageSquare,
      },
      {
        title: 'تقويم الفعاليات',
        description: 'ورش عمل ومسابقات ولقاءات قادمة.',
        href: '/events',
        icon: Trophy,
      },
      {
        title: 'الإعلانات الرسمية',
        description: 'آخر الأخبار من الإدارة والمنصة.',
        href: '/announcements',
        icon: Megaphone,
      },
      {
        title: 'المحادثات المباشرة',
        description: 'تواصل فوري مع فريق الدعم وزملائك.',
        href: '/chat',
        icon: Users,
      },
    ],
  },
  {
    key: 'ai',
    title: 'مساعد الذكاء الاصطناعي',
    description: 'أدوات ذكية تقدم توصيات فورية وتجارب شخصية.',
    icon: Sparkles,
    highlightPaths: ['/ai/exam', '/tips'],
    items: [
      {
        title: 'المساعد الذكي',
        description: 'اسأل عن أي موضوع واحصل على شرح فوري.',
        href: '/ai',
        icon: Sparkles,
      },
      {
        title: 'نصائح دراسية',
        description: 'اقتراحات مخصصة حسب جدولك ووتيرة تقدمك.',
        href: '/tips',
        icon: Lightbulb,
      },
      {
        title: 'تحليل الاختبارات',
        description: 'مراجعة ذكية لأدائك في الاختبارات السابقة.',
        href: '/ai/exam',
        icon: GraduationCap,
      },
    ],
  },
  {
    key: 'account',
    title: 'الحساب والإعدادات',
    description: 'إدارة بياناتك الشخصية وتفضيلات الأمان والمظهر.',
    icon: ShieldCheck,
    highlightPaths: [
      '/settings/security',
      '/settings/language',
      '/settings/appearance',
      '/settings/notifications',
      '/achievements',
      '/leaderboard',
    ],
    items: [
      {
        title: 'الملف الشخصي',
        description: 'تحكم بمعلوماتك وصورتك الشخصية بسهولة.',
        href: '/profile',
        icon: User,
      },
      {
        title: 'الإعدادات المتقدمة',
        description: 'تحكم في اللغة والمظهر والتنبيهات.',
        href: '/settings',
        icon: Settings,
      },
      {
        title: 'إنجازاتك',
        description: 'تابع الأوسمة والنقاط التي حققتها.',
        href: '/achievements',
        icon: Award,
      },
      {
        title: 'لوحة الصدارة',
        description: 'قارن أداءك مع الزملاء في جميع المواد.',
        href: '/leaderboard',
        icon: Trophy,
      },
    ],
  },
];

const quickActionsBySection: Record<NavigationSectionKey | 'default', QuickAction[]> = {
  dashboard: [
    { label: 'عرض التحليلات', href: '/analytics', icon: BarChart3 },
    { label: 'تنبيهات اليوم', href: '/notifications', icon: Bell },
  ],
  learning: [
    { label: 'استعرض الدروس', href: '/courses', icon: BookOpen },
    { label: 'الموارد السريعة', href: '/resources', icon: Library },
  ],
  productivity: [
    { label: 'إضافة مهمة جديدة', href: '/tasks', icon: PlusCircle },
    { label: 'ابدأ جلسة تركيز', href: '/time', icon: Timer },
  ],
  community: [
    { label: 'زيارة المنتدى', href: '/forum', icon: MessageSquare },
    { label: 'تقويم الفعاليات', href: '/events', icon: CalendarDays },
  ],
  ai: [
    { label: 'المساعد الذكي', href: '/ai', icon: Sparkles },
    { label: 'نصائح الدراسة', href: '/tips', icon: Lightbulb },
  ],
  account: [
    { label: 'إعدادات الحساب', href: '/settings', icon: Settings },
    { label: 'تحديث الملف', href: '/profile', icon: User },
  ],
  default: [
    { label: 'قائمة المهام', href: '/tasks', icon: FileText },
    { label: 'إدارة الوقت', href: '/time', icon: Clock },
  ],
};

export function HeaderDesktop({ pathname, user, isAuthenticated }: HeaderDesktopProps) {
  const notificationsCount = 3;

  const isPathActive = React.useCallback(
    (targetPath: string) => {
      if (!targetPath) return false;
      if (targetPath === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(targetPath);
    },
    [pathname],
  );

  const activeSection = React.useMemo(
    () =>
      navigationSections.find((section) => {
        if (section.href && isPathActive(section.href)) return true;
        if (section.highlightPaths?.some((highlightPath) => isPathActive(highlightPath))) {
          return true;
        }
        return section.items?.some((item) => isPathActive(item.href));
      }),
    [isPathActive],
  );

  const quickActions = React.useMemo(() => {
    if (!activeSection) {
      return quickActionsBySection.default;
    }
    return quickActionsBySection[activeSection.key] ?? quickActionsBySection.default;
  }, [activeSection]);
  const ActiveSectionIcon = activeSection?.icon;

  const breadcrumbs = React.useMemo(() => {
    if (pathname === '/' || pathname.length === 0) {
      return [];
    }
    const segments = pathname.split('/').filter(Boolean);
    const crumbs = segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join('/')}`;
      const label = segmentLabels[segment] ?? toTitleCase(segment);
      return { href, label };
    });

    return [{ href: '/', label: segmentLabels.home ?? 'الرئيسية' }, ...crumbs];
  }, [pathname]);

  const secondaryLinks = React.useMemo(() => {
    if (!activeSection?.items) return [];
    return activeSection.items;
  }, [activeSection]);

  return (
    <div className="container px-4 py-3">
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-background/90 px-6 py-4 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)] backdrop-blur">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 -top-24 h-44 rounded-full bg-gradient-to-r from-primary/30 via-primary/20 to-transparent blur-3xl"
        />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Image
                    src="/globe.svg"
                    alt="Thanawy+"
                    width={32}
                    height={32}
                    className="h-8 w-8"
                  />
                </span>
                <div className="flex flex-col">
                  <span className="text-base font-semibold leading-tight text-foreground">
                    Thanawy+
                  </span>
                  <span className="text-xs text-muted-foreground">
                    منصة دراسية متكاملة للثانوية العامة
                  </span>
                </div>
              </Link>

              {activeSection && (
                <div className="hidden max-w-md flex-col gap-1 md:flex">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground/70">
                    مسار الصفحة الحالية
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-2 rounded-full bg-primary/10 text-primary"
                    >
                      {ActiveSectionIcon ? (
                        <ActiveSectionIcon className="h-4 w-4" />
                      ) : null}
                      <span className="text-sm font-semibold">{activeSection.title}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {activeSection.description}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="relative hidden max-w-md flex-1 items-center md:flex">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ابحث عن درس أو مهمة أو إعداد..."
                  className="h-10 w-full rounded-full border border-border/60 bg-background/80 pl-9 pr-3 text-sm shadow-sm focus-visible:ring-primary/40"
                />
                <kbd className="pointer-events-none absolute right-3 hidden rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:flex">
                  Ctrl K
                </kbd>
              </div>

              <div className="hidden items-center gap-2 lg:flex">
                {quickActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={action.href}
                      variant="outline"
                      size="sm"
                      asChild
                      className="rounded-full border-border/60 bg-background/70 px-4 text-sm font-medium transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                    >
                      <Link href={action.href} className="flex items-center gap-2">
                        <ActionIcon className="h-4 w-4" />
                        <span>{action.label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />

                {isAuthenticated && user ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9 rounded-full border border-transparent bg-background/80 transition hover:border-primary/50"
                    >
                      <Bell className="h-4 w-4" />
                      {notificationsCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {notificationsCount}
                        </span>
                      )}
                      <span className="sr-only">قائمة الإشعارات</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex items-center gap-2 rounded-full border border-transparent bg-background/80 px-2 py-1 transition hover:border-primary/50"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={user?.avatar || user?.image || ''}
                              alt={user?.name || 'User avatar'}
                            />
                            <AvatarFallback>
                              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="hidden flex-col text-left lg:flex">
                            <span className="text-sm font-semibold leading-tight">
                              {user?.name ?? 'مستخدم'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              مرحباً بعودتك!
                            </span>
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64" align="end" forceMount>
                        <DropdownMenuLabel className="flex flex-col gap-1">
                          <span className="text-sm font-semibold leading-none">
                            {user?.name ?? 'مستخدم'}
                          </span>
                          {user?.email && (
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>الملف الشخصي</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/settings" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <span>الإعدادات</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href="/settings/security"
                            className="flex items-center gap-2"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>أمان الحساب</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="flex items-center gap-2">
                          <LogOut className="h-4 w-4" />
                          <span>تسجيل الخروج</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/login">تسجيل الدخول</Link>
                    </Button>
                    <Button size="sm" asChild className="rounded-full">
                      <Link href="/login?view=register">إنشاء حساب</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <NavigationMenu>
              <NavigationMenuList className="flex flex-wrap items-center gap-2">
                {navigationSections.map((section) => {
                  const SectionIcon = section.icon;
                  const sectionActive = activeSection?.key === section.key;

                  const triggerClasses = cn(
                    'group flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-sm font-medium transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary',
                    sectionActive
                      ? 'border-primary/60 bg-primary text-primary-foreground shadow-sm hover:bg-primary'
                      : 'text-muted-foreground',
                  );

                  if (section.items && section.items.length > 0) {
                    return (
                      <NavigationMenuItem key={section.key}>
                        <NavigationMenuTrigger className={triggerClasses}>
                          <SectionIcon className="h-4 w-4" />
                          <span>{section.title}</span>
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <div className="grid gap-4 p-4 md:w-[520px] lg:w-[700px] lg:grid-cols-[240px_1fr]">
                            <div className="flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent p-4 shadow-inner">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                                <SectionIcon className="h-5 w-5" />
                              </span>
                              <div className="mt-4">
                                <h3 className="text-base font-semibold text-foreground">
                                  {section.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                  {section.description}
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {section.items.map((item) => {
                                const ItemIcon = item.icon;
                                const itemActive = isPathActive(item.href);

                                return (
                                  <NavigationMenuLink asChild key={item.href}>
                                    <Link
                                      href={item.href}
                                      className={cn(
                                        'group flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-background/90 p-3 transition-all hover:border-primary/60 hover:bg-primary/5 hover:shadow-md',
                                        itemActive && 'border-primary bg-primary/10 shadow-sm',
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20">
                                          <ItemIcon className="h-4 w-4" />
                                        </span>
                                        <span className="text-sm font-semibold text-foreground">
                                          {item.title}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                        {item.description}
                                      </p>
                                    </Link>
                                  </NavigationMenuLink>
                                );
                              })}
                            </div>
                          </div>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    );
                  }

                  return (
                    <NavigationMenuItem key={section.key}>
                      <NavigationMenuLink asChild>
                        <Link href={section.href ?? '#'} className={triggerClasses}>
                          <SectionIcon className="h-4 w-4" />
                          <span>{section.title}</span>
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>

            {secondaryLinks.length > 0 && (
              <div className="hidden items-center gap-2 xl:flex">
                {secondaryLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-full px-3 py-1 text-sm transition',
                      isPathActive(item.href)
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {breadcrumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && <span className="px-1 text-muted-foreground/60">/</span>}
                    {isLast ? (
                      <span className="font-semibold text-foreground">{crumb.label}</span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="transition hover:text-foreground"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
