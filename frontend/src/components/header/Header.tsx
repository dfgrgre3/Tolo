"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, memo, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import { TimeTrackerHeaderWidget } from "./TimeTrackerHeaderWidget";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HeaderLogo } from "./HeaderLogo";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderNavigation } from "./HeaderNavigation";
import { HeaderNotifications } from "./HeaderNotifications";
import { HeaderBreadcrumbs } from "./HeaderBreadcrumbs";
import { useMegaMenuState } from "./useMegaMenuState";
import ProgressIndicator from "./ProgressIndicator";
import { useHeaderKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useStickyHeader } from "@/hooks/use-sticky-header";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "./UserMenu";
import { useEfficiencyMode } from "@/hooks/use-efficiency-mode";

const CommandPalette = dynamic(
  () => import("./CommandPalette").then((mod) => ({ default: mod.CommandPalette })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const QuickActions = dynamic(
  () => import("./QuickActions").then((mod) => ({ default: mod.QuickActions })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const ActivityWidget = dynamic(
  () => import("./ActivityWidget").then((mod) => ({ default: mod.ActivityWidget })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const ContextualHelp = dynamic(
  () => import("./ContextualHelp").then((mod) => ({ default: mod.ContextualHelp })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const SmartNavigationSuggestions = dynamic(
  () => import("./SmartNavigationSuggestions").then((mod) => ({ default: mod.SmartNavigationSuggestions })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const HeaderMobileMenuEnhanced = dynamic(
  () => import("./HeaderMobileMenuEnhanced").then((mod) => ({ default: mod.HeaderMobileMenuEnhanced })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const ReadingProgressBar = dynamic(
  () => import("./ReadingProgressBar").then((mod) => ({ default: mod.ReadingProgressBar })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const MemoizedHeaderLogo = memo(HeaderLogo);
const MemoizedHeaderSearch = memo(HeaderSearch);
const MemoizedHeaderNavigation = memo(HeaderNavigation);
const MemoizedHeaderBreadcrumbs = memo(HeaderBreadcrumbs);

const buildLoginUrl = (redirect?: string) => {
  return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
};

const HEADER_PREFERENCES = {
  compactMode: false,
  showProgress: true,
  showSuggestions: true,
  showActivity: true,
};

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEfficiencyMode = useEfficiencyMode();
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const shouldReduceMotion = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const { isScrolled, isShrunk } = useStickyHeader({
    shrinkThreshold: 80,
    hideThreshold: 300,
    showOnScrollUp: true,
    enableProgress: true,
  });

  const { user, isLoading } = useAuth();
  const { openMegaMenu, setOpenMegaMenu, mounted } = useMegaMenuState();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mounted) return;
    const height = headerRef.current?.offsetHeight;
    if (height) {
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }
  }, [mounted]);

  useHeaderKeyboardShortcuts({
    mounted,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  });

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const isActiveRoute = useCallback((href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }, [pathname]);

  const computedHeaderClasses = useMemo(() => {
    return cn(
      "sticky top-0 z-50 w-full transition-colors duration-200 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      isScrolled && "shadow-sm border-primary/20",
      isMounted && user && !isScrolled && "border-primary/10"
    );
  }, [isScrolled, isMounted, user]);

  const containerHeight = useMemo(() => {
    if (HEADER_PREFERENCES.compactMode || isShrunk) return "h-12 sm:h-14";
    return "h-14 sm:h-16";
  }, [isShrunk]);

  const loginUrl = useMemo(() => {
    const query = searchParams.toString();
    const fullPath = `${pathname || '/'}${query ? `?${query}` : ''}`;
    return buildLoginUrl(fullPath);
  }, [pathname, searchParams]);

  return (
    <>
      {HEADER_PREFERENCES.showProgress && !isEfficiencyMode && (
        <ReadingProgressBar position="top" height={2} animate={!shouldReduceMotion} />
      )}

      <header ref={headerRef} className={computedHeaderClasses} role="banner" aria-label="رأس الصفحة الرئيسي">
        <div className="container mx-auto px-2 sm:px-3 md:px-4 lg:px-6 max-w-full">
          <div className={cn("flex items-center justify-between gap-1 sm:gap-2 md:gap-3 lg:gap-4 transition-all", containerHeight)}>
            <MemoizedHeaderLogo />

            <MemoizedHeaderNavigation
              openMegaMenu={openMegaMenu}
              setOpenMegaMenu={setOpenMegaMenu}
              isActiveRoute={isActiveRoute}
              mounted={mounted}
              user={user as any}
            />

            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 shrink-0" role="toolbar" aria-label="أدوات الرأس">
              {HEADER_PREFERENCES.showProgress && isShrunk && !isEfficiencyMode && (
                <AnimatePresence>
                  <m.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="hidden xl:flex">
                    <ProgressIndicator />
                  </m.div>
                </AnimatePresence>
              )}

              {HEADER_PREFERENCES.showSuggestions && !isEfficiencyMode && (
                <div className="hidden xl:block">
                  <SmartNavigationSuggestions />
                </div>
              )}

              <MemoizedHeaderSearch />

              {!isEfficiencyMode && (
                <div className="hidden md:block">
                  <QuickActions />
                </div>
              )}

              {HEADER_PREFERENCES.showActivity && !isEfficiencyMode && (
                <div className="hidden xl:block">
                  <ActivityWidget />
                </div>
              )}

              {!isEfficiencyMode && (
                <div className="hidden md:block">
                  <ContextualHelp />
                </div>
              )}

              {/* Global Timer Widget - always visible, but compact on mobile */}
              <TimeTrackerHeaderWidget />

              {mounted && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <ThemeToggle />
                </div>
              )}

              {isMounted && (
                <HeaderNotifications user={user as any} mounted={mounted} />
              )}

              {isMounted && (
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                  {isLoading ? (
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 animate-pulse" />
                  ) : user ? (
                    <UserMenu />
                  ) : (
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Link href={loginUrl}>
                        <Button variant="ghost" size="sm" className="gap-1.5 hover:bg-primary/10 text-sm font-semibold transition-all hover:scale-105 active:scale-95 px-2 sm:px-3 lg:px-4">
                          <LogIn className="h-4 w-4" />
                          <span className="hidden sm:inline">تسجيل الدخول</span>
                        </Button>
                      </Link>
                      <Link href="/register" className="hidden sm:block">
                        <Button size="sm" className="gap-2 bg-gradient-to-r from-primary via-primary/95 to-primary/80 hover:from-primary hover:to-primary/90 text-primary-foreground shadow-[0_4px_15px_rgba(var(--primary),0.25)] hover:shadow-primary/40 transition-all font-bold px-3 sm:px-4 lg:px-6 hover:scale-105 active:scale-95 group relative overflow-hidden">
                          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
                          <UserPlus className="h-4 w-4 transition-transform group-hover:rotate-12 relative z-10" />
                          <span className="relative z-10 font-bold hidden md:inline">إنشاء حساب</span>
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden relative overflow-hidden hover:bg-primary/10 dark:hover:bg-primary/15 h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                data-mobile-menu-trigger
              >
                <AnimatePresence>
                  {isMobileMenuOpen ? (
                    <m.div key="close" initial={shouldReduceMotion || isEfficiencyMode ? undefined : { rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={shouldReduceMotion || isEfficiencyMode ? undefined : { rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <X className="h-5 w-5" aria-hidden="true" />
                    </m.div>
                  ) : (
                    <m.div key="menu" initial={shouldReduceMotion || isEfficiencyMode ? undefined : { rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={shouldReduceMotion || isEfficiencyMode ? undefined : { rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    </m.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </div>

        {!isShrunk && <MemoizedHeaderBreadcrumbs />}
      </header>

      <HeaderMobileMenuEnhanced
        key={pathname || "root"}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isActiveRoute={isActiveRoute}
        mounted={mounted}
      />

      <CommandPalette open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen} />
    </>
  );
}
