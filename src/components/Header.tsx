"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HeaderLogo } from "./header/HeaderLogo";
import { HeaderSearch } from "./header/HeaderSearch";
import { HeaderNavigation } from "./header/HeaderNavigation";
import { EnhancedNotifications } from "./header/EnhancedNotifications";
import { HeaderUserMenu } from "./header/HeaderUserMenu";
import { HeaderBreadcrumbs } from "./header/HeaderBreadcrumbs";
// import removed
import { useMegaMenuState } from "./header/useMegaMenuState";
import ProgressIndicator from "./header/ProgressIndicator";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// New enhanced imports
import { useStickyHeader } from "./header/hooks/useStickyHeader";

// Dynamic imports for better performance
const CommandPalette = dynamic(
  () => import("./header/CommandPalette").then((mod) => ({ default: mod.CommandPalette })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const QuickActions = dynamic(
  () => import("./header/QuickActions").then((mod) => ({ default: mod.QuickActions })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const ActivityWidget = dynamic(
  () => import("./header/ActivityWidget").then((mod) => ({ default: mod.ActivityWidget })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const ContextualHelp = dynamic(
  () => import("./header/ContextualHelp").then((mod) => ({ default: mod.ContextualHelp })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const SmartNavigationSuggestions = dynamic(
  () => import("./header/SmartNavigationSuggestions").then((mod) => ({ default: mod.SmartNavigationSuggestions })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const LanguageSwitch = dynamic(
  () => import("./header/LanguageSwitch").then((mod) => ({ default: mod.LanguageSwitch })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

// Enhanced mobile menu
const HeaderMobileMenuEnhanced = dynamic(
  () => import("./header/HeaderMobileMenuEnhanced").then((mod) => ({ default: mod.HeaderMobileMenuEnhanced })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

// Reading progress bar
const ReadingProgressBar = dynamic(
  () => import("./header/ReadingProgressBar").then((mod) => ({ default: mod.ReadingProgressBar })).catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

// Memoized components for better performance
const MemoizedHeaderLogo = memo(HeaderLogo);
const MemoizedHeaderSearch = memo(HeaderSearch);
const MemoizedHeaderNavigation = memo(HeaderNavigation);
const MemoizedHeaderBreadcrumbs = memo(HeaderBreadcrumbs);

export default function Header() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Enhanced sticky header with shrink animation
  const { isScrolled, isShrunk, isHidden, scrollProgress, headerClasses } = useStickyHeader({
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

  // Auth context
  const authContext: any = { user: null, isAuthenticated: false, isLoading: false };
  const user = authContext?.user ?? null;

  // Mega menu state
  const { openMegaMenu, setOpenMegaMenu, mounted } = useMegaMenuState();

  // Header preferences REMOVED - hardcoded preferences
  const headerPreferences = {
    compactMode: false,
    showProgress: true,
    showSuggestions: true,
    showActivity: true,
  };

  // Ensure component is mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    mounted,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  });

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenMegaMenu(null);
  }, [pathname, setOpenMegaMenu]);

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
      "sticky top-0 z-50 w-full border-b transition-all",
      shouldReduceMotion ? "duration-0" : "duration-300 ease-out",
      // Blur and background
      "backdrop-blur-xl supports-[backdrop-filter]:bg-background/80",
      // Hide on scroll
      focusVisibility.headerVisible && !isHidden ? "translate-y-0" : "-translate-y-full",
      // Scrolled state
      isScrolled && "bg-background/90 shadow-lg shadow-black/5 dark:shadow-black/20 border-border/50",
      // Shrunk state
      isShrunk && headerPreferences.compactMode && "py-0",
      // User logged in premium effect
      isMounted && user && !isScrolled && "border-primary/10 bg-gradient-to-r from-primary/5 via-background to-primary/5",
    );
    return base;
  }, [
    shouldReduceMotion,
    isScrolled,
    isShrunk,
    isHidden,
    isMounted,
    user,
    headerPreferences.compactMode,
    focusVisibility.headerVisible,
  ]);

  // Container height based on shrink state
  const containerHeight = useMemo(() => {
    if (headerPreferences.compactMode || isShrunk) return "h-12";
    return "h-16";
  }, [headerPreferences.compactMode, isShrunk]);

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

      <motion.header
        className={computedHeaderClasses}
        initial={false}
        animate={{
          y: focusVisibility.headerVisible && !isHidden ? 0 : -100,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        role="banner"
        aria-label="رأس الصفحة الرئيسي"
      >
        <div className="container mx-auto px-4">
          <div className={cn("flex items-center justify-between gap-4 transition-all", containerHeight)}>
            {/* Logo */}
            <MemoizedHeaderLogo />

            {/* Desktop Navigation */}
            {focusVisibility.showNavigation && (
              <MemoizedHeaderNavigation
                openMegaMenu={openMegaMenu}
                setOpenMegaMenu={setOpenMegaMenu}
                isActiveRoute={isActiveRoute}
                mounted={mounted}
                user={user}
              />
            )}

            {/* Right Side Actions */}
            <div className="flex items-center gap-1 md:gap-2" role="toolbar" aria-label="أدوات الرأس">
              {/* Progress Indicator (compact) */}
              {headerPreferences.showProgress && isShrunk && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="hidden md:flex"
                  >
                    <ProgressIndicator />
                  </motion.div>
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

              {/* Contextual Help */}
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
                <EnhancedNotifications user={user} mounted={mounted} />
              )}

              {/* User Menu */}
              {focusVisibility.showUserMenu && (
                <HeaderUserMenu />
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden relative overflow-hidden"
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                data-mobile-menu-trigger
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {!isShrunk && <MemoizedHeaderBreadcrumbs />}

        {/* Mobile Menu */}
        <HeaderMobileMenuEnhanced
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isActiveRoute={isActiveRoute}
          mounted={mounted}
        />

        {/* Command Palette */}
        <CommandPalette open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen} />
      </motion.header>
    </>
  );
}