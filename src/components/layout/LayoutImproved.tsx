"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
// import { Navbar } from "./Navbar"; // تم تعطيل النافبار
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { useHydrationFix } from "@/hydration-fix";
import { useMediaQuery } from "@/hooks/use-media-query";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  showSidebar?: boolean;
}

export function LayoutImproved({ children, className, showSidebar = true }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // استخدام useLocalStorageState بدلاً من الوصول المباشر إلى localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorageState("sidebar-collapsed", false);
  const [mounted, setMounted] = useState(false);
  
  // استخدام useHydrationFix بشكل صحيح
  const isHydrated = useHydrationFix();

  // استخدام useMediaQuery للتحقق من حجم الشاشة
  const isMobile = useMediaQuery("(max-width: 768px)");

  // إغلاق الشريط الجانبي تلقائياً عند التبديل إلى وضع سطح المكتب
  useEffect(() => {
    if (!isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // دالة لتبديل حالة الشريط الجانبي
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // حساب الهوامش ديناميكياً بناءً على حالة الشريط الجانبي
  const mainContentMargin = useMemo(() => {
    if (!showSidebar) return "";
    if (!mounted) return "md:ml-64"; // القيمة الافتراضية قبل التحميل
    return isSidebarCollapsed ? "md:ml-16" : "md:ml-64";
  }, [showSidebar, mounted, isSidebarCollapsed]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Navbar */}

      <div className="flex">
        {showSidebar && (
          <>
            {/* Mobile Sidebar Overlay */}
            {mounted && sidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Sidebar */}
            <div className={cn(
              "fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out md:translate-x-0",
              // فقط في جانب العميل نطبق التحويل
              mounted && (sidebarOpen ? "translate-x-0" : "-translate-x-full"),
              // إذا لم يتم تحميل المكون بعد، نضمن عدم عرض الشريط الجانبي
              !mounted && "-translate-x-full",
              // إضافة الظل عند فتح الشريط الجانبي في الهاتف
              isMobile && sidebarOpen && "shadow-xl"
            )}>
              <Sidebar isCollapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
            </div>
          </>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          mainContentMargin,
          className
        )}>
          {/* Mobile Sidebar Toggle */}
          {showSidebar && mounted && (
            <div className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b p-4 transition-all duration-200">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md hover:bg-accent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50"
                aria-label={sidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 transition-transform duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {sidebarOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          )}

          {/* عرض شريط جانبي مؤقت أثناء التحميل في الشاشات الصغيرة */}
          {showSidebar && !mounted && (
            <div className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b p-4 transition-all duration-200">
              <div className="p-2 rounded-md bg-gray-100 animate-pulse h-9 w-9" />
            </div>
          )}

          <div className="p-4 md:p-6 transition-all duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
