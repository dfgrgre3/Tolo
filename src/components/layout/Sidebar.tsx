"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LOCAL_USER_KEY = "tw_user_id";

import { safeGetItem, safeSetItem } from '@/lib/safe-client-utils';

// Safe localStorage access that doesn't run during SSR
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    return safeGetItem(key, { fallback: null });
  },
  setItem: (key: string, value: string): void => {
    safeSetItem(key, value);
  }
};

async function ensureUser(): Promise<string> {
  // التأكد من أننا في المتصفح وليس في الخادم
  if (typeof window === 'undefined') {
    throw new Error('localStorage is not available');
  }

  let id = safeLocalStorage.getItem(LOCAL_USER_KEY);
  if (!id) {
    try {
      const res = await fetch("/api/users/guest", { method: "POST" });
      const data = await res.json();
      id = data.id;
      if (id) {
        safeLocalStorage.setItem(LOCAL_USER_KEY, id);
      }
    } catch (error) {
      console.error('فشل في الحصول على معرف المستخدم:', error);
      // Return a fallback ID if API fails
      id = 'guest-user';
    }
  }
  return id!;
}

type NavItem = {
  href: string;
  label: string;
  icon: string;
  description?: string;
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "الرئيسية",
    icon: "🏠",
    description: "الصفحة الرئيسية"
  },
  {
    href: "/courses",
    label: "الدورات",
    icon: "📚",
    description: "الدورات التعليمية"
  },
  {
    href: "/library",
    label: "المكتبة",
    icon: "📖",
    description: "المكتبة الرقمية"
  },
  {
    href: "/blog",
    label: "المدونة",
    icon: "📝",
    description: "المدونة التعليمية"
  },
  {
    href: "/forum",
    label: "المنتدى",
    icon: "💬",
    description: "المنتدى التعليمي"
  },
  {
    href: "/events",
    label: "المناسبات",
    icon: "🎪",
    description: "المناسبات والفعاليات"
  },
  {
    href: "/announcements",
    label: "الإعلانات",
    icon: "📢",
    description: "الإعلانات والمسابقات"
  },
  {
    href: "/chat",
    label: "الدردشة",
    icon: "💬",
    description: "الدردشة مع المستخدمين"
  },
  {
    href: "/profile",
    label: "الملف الشخصي",
    icon: "👤",
    description: "ملفك الشخصي"
  },
  {
    href: "/settings",
    label: "الإعدادات",
    icon: "⚙️",
    description: "إعدادات الحساب"
  },
];

export function Sidebar() {
  const pathname = usePathname();
  // Initialize with a consistent default that matches server render
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // التحقق من أننا في بيئة المتصفح
  const isClient = typeof window !== "undefined";

  // استخدام useEffect لتحديد التحميل في العميل فقط
  useEffect(() => {
    // Set hydrated flag after component mounts
    setIsHydrated(true);

    // Check if sidebar should be collapsed based on localStorage
    const savedCollapsedState = safeLocalStorage.getItem('sidebarCollapsed');
    if (savedCollapsedState === 'true') {
      setIsCollapsed(true);
    }

    // تشغيل ensureUser فقط في العميل
    const initializeUser = async () => {
      try {
        await ensureUser();
        // تم تشغيل ensureUser بنجاح للتأكد من وجود المستخدم في localStorage
      } catch (error) {
        console.error('فشل في الحصول على معرف المستخدم:', error);
      }
    };

    initializeUser();
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Handle toggle with localStorage persistence
  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (isClient) {
      try {
        localStorage.setItem('sidebarCollapsed', newState.toString());
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  };

  // Use consistent class names that match server render
  const sidebarClasses = cn(
    "hidden md:flex flex-col h-full bg-card border-r transition-all duration-300",
    isCollapsed ? "w-16" : "w-64"
  );

  return (
    <div className={sidebarClasses}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">ث</span>
              </div>
              <span className="font-bold text-xl">ثانوي</span>
            </Link>
          )}
          <button
            onClick={handleToggle}
            className="p-2 rounded-md hover:bg-accent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="text-lg">{item.icon}</span>
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {!isCollapsed && (
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground mb-2">
            الإعدادات السريعة
          </div>
          <div className="space-y-2">
            <Link
              href="/time"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <span>⏱️</span>
              <span>تنظيم الوقت</span>
            </Link>
            <Link
              href="/tasks"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <span>✅</span>
              <span>المهام</span>
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <span>📊</span>
              <span>الإحصائيات</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
