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
import { MegaMenu } from "@/components/mega-menu";
import { headerNavItems } from "@/components/mega-menu/navData";
import ProgressIndicator from "./ProgressIndicator";
import { useHeaderKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useStickyHeader } from "@/hooks/use-sticky-header";
import { useAuth } from "@/hooks/use-auth";
import { UserMenu } from "./UserMenu";
import { useEfficiencyMode } from "@/hooks/use-efficiency-mode";
import { ImpersonationBanner } from "./ImpersonationBanner";

// Dynamic imports with optimization
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

// Memoized components for performance
const MemoizedHeaderLogo = memo(HeaderLogo);
const MemoizedHeaderSearch = memo(HeaderSearch);
const MemoizedHeaderNavigation = memo(HeaderNavigation);
const MemoizedHeaderBreadcrumbs = memo(HeaderBreadcrumbs);

import { useLoginUrl, useHeaderClasses, useContainerHeight, useHeaderWidgets, HEADER_PREFERENCES } from "./useHeaderOptimizations";

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEfficiencyMode = useEfficiencyMode();
  const loginUrl = useLoginUrl();

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
  const [schoolsMenuOpen, setSchoolsMenuOpen] = useState<string | null>(null);

  const headerClasses = useHeaderClasses(isScrolled, mounted, user);
  const containerHeight = useContainerHeight(isShrunk);
  const widgets = useHeaderWidgets(isEfficiencyMode);

  useEffect(() => {
    if (!mounted || !headerRef.current) return;
    const updateHeight = () => {
      const height = headerRef.current?.offsetHeight;
      if (height) {
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };
    
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(headerRef.current);
    return () => observer.disconnect();
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

  return (
    <>
      <ImpersonationBanner />
      {widgets.progress && (
        <ReadingProgressBar position="top" height={1} animate={!shouldReduceMotion} />
      )}

      <header ref={headerRef} className={headerClasses} role="banner" aria-label="رأس الصفحة الرئيسي">
        <div className="container mx-auto px-2 sm:px-3 md:px-4 lg:px-6 max-w-full">
          <div className={cn("flex items-center justify-between gap-2 sm:gap-3 md:gap-4 lg:gap-6 transition-all", containerHeight)}>
            {/* Left side: Logo and teaching links */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
              <MemoizedHeaderLogo />
              <div className="hidden lg:flex items-center gap-2">
                <Link href="/teach" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-primary/5">
                  التدريس على Tolo
                </Link>
                <Link href="/careers" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-primary/5">
                  وظائف Tolo
                </Link>
              </div>
            </div>

            {/* Center: Search bar - always visible */}
            <div className="flex-1 max-w-2xl mx-4">
              <MemoizedHeaderSearch />
            </div>

            {/* Right side: Schools, Plans, and widgets */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0" role="toolbar" aria-label="أدوات الرأس">
              {isShrunk && widgets.progress && (
                <AnimatePresence>
                  <m.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="hidden xl:flex">
                    <ProgressIndicator />
                  </m.div>
                </AnimatePresence>
              )}

              {/* Schools with megamenu */}
              <div className="hidden lg:block">
                {headerNavItems[0] && (() => {
                  const item = headerNavItems[0];
                  return (
                    <MegaMenu
                      categories={item.megaMenu || []}
                      isOpen={schoolsMenuOpen === item.href}
                      onClose={() => setSchoolsMenuOpen(null)}
                      onOpen={() => setSchoolsMenuOpen(item.href)}
                      activeRoute={isActiveRoute}
                      label={item.label}
                      user={user as any}
                      className="relative h-11 px-4 flex items-center gap-2 transition-all duration-300 rounded-xl font-semibold text-sm text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:bg-primary/5"
                    />
                  );
                })()}
              </div>

              {/* Plans link */}
              <Link href="/plans" className="hidden lg:flex items-center h-11 px-4 text-sm font-semibold text-muted-foreground hover:text-primary transition-all rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5">
                الخطط
              </Link>

              {widgets.suggestions && (
                <div className="hidden xl:block">
                  <SmartNavigationSuggestions />
                </div>
              )}

              {widgets.quickActions && (
                <div className="hidden md:block">
                  <QuickActions />
                </div>
              )}

              {widgets.activity && (
                <div className="hidden xl:block">
                  <ActivityWidget />
                </div>
              )}

              {widgets.contextualHelp && (
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

              {mounted && (
                <HeaderNotifications user={user as any} mounted={mounted} />
              )}

              {mounted && (
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

          {/* Second row: Navigation items below the logo & actions */}
          <div className="hidden lg:flex items-center justify-center border-t border-border/40 py-1.5">
            <MemoizedHeaderNavigation
              openMegaMenu={openMegaMenu}
              setOpenMegaMenu={setOpenMegaMenu}
              isActiveRoute={isActiveRoute}
              mounted={mounted}
              user={user as any}
            />
          </div>

        </div>

        {!isShrunk && <MemoizedHeaderBreadcrumbs />}
        
        {/* Premium bottom glow border line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />
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
