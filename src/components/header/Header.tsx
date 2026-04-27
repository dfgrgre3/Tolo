"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, memo, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HeaderLogo } from "./HeaderLogo";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderNavigation } from "./HeaderNavigation";
import { HeaderNotifications } from "./HeaderNotifications";
// import removed

import { HeaderBreadcrumbs } from "./HeaderBreadcrumbs";
// import removed
import { useMegaMenuState } from "./useMegaMenuState";
import ProgressIndicator from "./ProgressIndicator";
import { useHeaderKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useStickyHeader } from "@/hooks/use-sticky-header";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "./UserMenu";
import { LogIn, UserPlus } from "lucide-react";
// Removed broken import: import { buildLoginUrl } from "@/services/auth/navigation";
const buildLoginUrl = (redirect?: string) => {
  return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
};

// Dynamic imports for better performance
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

// Enhanced mobile menu
const HeaderMobileMenuEnhanced = dynamic(
  () => import("./HeaderMobileMenuEnhanced").then((mod) => ({ default: mod.HeaderMobileMenuEnhanced })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

// Reading progress bar
const ReadingProgressBar = dynamic(
  () => import("./ReadingProgressBar").then((mod) => ({ default: mod.ReadingProgressBar })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

// Memoized components for better performance
const MemoizedHeaderLogo = memo(HeaderLogo);
const MemoizedHeaderSearch = memo(HeaderSearch);
const MemoizedHeaderNavigation = memo(HeaderNavigation);
const MemoizedHeaderBreadcrumbs = memo(HeaderBreadcrumbs);

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      setShouldReduceMotion(mql.matches);
      const handler = (e: MediaQueryListEvent) => setShouldReduceMotion(e.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Enhanced sticky header with shrink animation
  const { isScrolled, isShrunk, isHidden } = useStickyHeader({
    shrinkThreshold: 80,
    hideThreshold: 300,
    showOnScrollUp: true,
    enableProgress: true,
  });

  // Focus mode REMOVED - hardcoded visibility
  const focusVisibility = {
    headerVisible: true,
    showNavigation: true,
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
  };

  const { user, isLoading } = useAuth();


  // Mega menu state
  const { openMegaMenu, setOpenMegaMenu, mounted } = useMegaMenuState();

  const headerRef = useRef<HTMLElement>(null);

  // Measure header height for MegaMenu positioning
  useEffect(() => {
    if (!mounted) return;
    
    const updateHeight = () => {
      const height = headerRef.current?.offsetHeight;
      if (height) {
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };
    
    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (headerRef.current) resizeObserver.observe(headerRef.current);
    
    // Also update on scroll/shrink
    return () => resizeObserver.disconnect();
  }, [mounted, isShrunk, pathname]);

  // Header preferences REMOVED - hardcoded preferences
  const headerPreferences = {
    compactMode: false,
    showProgress: true,
    showSuggestions: true,
    showActivity: true,
  };

  // Keyboard shortcuts
  useHeaderKeyboardShortcuts({
    mounted,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  });

  // Toggle mobile menu
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  // Memoized active route checker
  const isActiveRoute = useCallback((href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }, [pathname]);

  // Memoized header classes
  const computedHeaderClasses = useMemo(() => {
    const base = cn(
      "sticky top-0 z-50 w-full transition-all duration-500 ease-in-out border-b backdrop-blur-md bg-background/70 dark:bg-background/80 shadow-[0_4px_30px_rgba(0,0,0,0.05)]",
      focusVisibility.headerVisible && (!isHidden || !!openMegaMenu) ? "translate-y-0" : "-translate-y-full",
      isScrolled && "bg-background/90 shadow-[0_4px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.35)] border-primary/20",
      isShrunk && headerPreferences.compactMode && "py-0",
      isMounted && user && !isScrolled && "bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-primary/10",
    );
    return base;
  }, [
    isScrolled,
    isShrunk,
    isHidden,
    isMounted,
    user,
    headerPreferences.compactMode,
    focusVisibility.headerVisible,
    openMegaMenu,
  ]);

  // Container height based on shrink state
  const containerHeight = useMemo(() => {
    if (headerPreferences.compactMode || isShrunk) return "h-12";
    return "h-16";
  }, [headerPreferences.compactMode, isShrunk]);

  const loginUrl = useMemo(() => {
    const query = searchParams.toString();
    const fullPath = `${pathname || '/'}${query ? `?${query}` : ''}`;
    return buildLoginUrl(fullPath);
  }, [pathname, searchParams]);

  return (
    <>
      {/* Reading Progress Bar */}
      {headerPreferences.showProgress && (
        <ReadingProgressBar
          position="top"
          height={2}
          animate={!shouldReduceMotion}
        />
      )}

      <m.header
        ref={headerRef}
        className={computedHeaderClasses}
        initial={false}
        animate={{
          y: focusVisibility.headerVisible && (!isHidden || !!openMegaMenu) ? 0 : -100,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        role="banner"
        aria-label="رأس الصفحة الرئيسي"
      >
        <div className="container mx-auto px-2 sm:px-4">
          <div className={cn("flex items-center justify-between gap-1.5 sm:gap-2 md:gap-4 transition-all", containerHeight)}>
            {/* Logo */}
            <MemoizedHeaderLogo />

            {/* Desktop Navigation */}
            {focusVisibility.showNavigation && (
              <MemoizedHeaderNavigation
                openMegaMenu={openMegaMenu}
                setOpenMegaMenu={setOpenMegaMenu}
                isActiveRoute={isActiveRoute}
                mounted={mounted}
                user={user as any}
              />
            )}

            {/* Right Side Actions */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2" role="toolbar" aria-label="أدوات الرأس">
              {/* Progress Indicator (compact) */}
              {headerPreferences.showProgress && isShrunk && (
                <AnimatePresence>
                  <m.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="hidden md:flex"
                  >
                    <ProgressIndicator />
                  </m.div>
                </AnimatePresence>
              )}

              {/* Smart Navigation Suggestions */}
              {headerPreferences.showSuggestions && focusVisibility.showNavigation && (
                <div className="hidden lg:block">
                  <SmartNavigationSuggestions />
                </div>
              )}

              {/* Search */}
              {focusVisibility.showSearch && (
                <MemoizedHeaderSearch />
              )}

              {/* Quick Actions */}
              <div className="hidden md:block">
                <QuickActions />
              </div>

              {/* Activity Widget */}
              {headerPreferences.showActivity && (
                <div className="hidden lg:block">
                  <ActivityWidget />
                </div>
              )}

              {/* ContextualHelp */}
              <div className="hidden md:block">
                <ContextualHelp />
              </div>

              {/* Theme Toggle */}
              {mounted && (
                <div className="hidden md:flex">
                  <ThemeToggle />
                </div>
              )}

              {/* Notifications */}
              {isMounted && focusVisibility.showNotifications && (
                  <HeaderNotifications user={user as any} mounted={mounted} />
              )}

              {/* User Menu & Auth Buttons */}
              {isMounted && (
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <div className="h-9 w-9 rounded-full bg-primary/10 animate-pulse" />
                  ) : user ? (
                    <UserMenu />
                  ) : (
                    <div className="hidden md:flex items-center gap-1.5">
                      <Link href={loginUrl}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1.5 hover:bg-primary/10 text-sm font-semibold transition-all hover:scale-105 active:scale-95 px-4"
                        >
                          <LogIn className="h-4 w-4" />
                          <span>تسجيل الدخول</span>
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button 
                          size="sm" 
                          className="gap-2 bg-gradient-to-r from-primary via-primary/95 to-primary/80 hover:from-primary hover:to-primary/90 text-primary-foreground shadow-[0_4px_15px_rgba(var(--primary),0.25)] hover:shadow-primary/40 transition-all font-bold px-6 hover:scale-105 active:scale-95 group relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
                          <UserPlus className="h-4 w-4 transition-transform group-hover:rotate-12 relative z-10" />
                          <span className="relative z-10 font-bold">إنشاء حساب</span>
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}


              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden relative overflow-hidden hover:bg-primary/10 dark:hover:bg-primary/15 h-9 w-9 sm:h-10 sm:w-10"
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                data-mobile-menu-trigger
              >
                <AnimatePresence>
                  {isMobileMenuOpen ? (
                    <m.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </m.div>
                  ) : (
                    <m.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    </m.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {!isShrunk && <MemoizedHeaderBreadcrumbs />}

      </m.header>

      {/* Mobile Menu */}
      <HeaderMobileMenuEnhanced
        key={pathname || "root"}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isActiveRoute={isActiveRoute}
        mounted={mounted}
      />

      {/* Command Palette */}
      <CommandPalette open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen} />
    </>
  );
}
