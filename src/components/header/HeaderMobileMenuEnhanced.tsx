"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ChevronDown,

  Search,
  X,
  Bell,
  Moon,
  Sun,
  Home,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { mainNavItemsWithMegaMenu, moreMegaMenu } from "@/components/mega-menu/navData";
import { cn } from "@/lib/utils";
// import removed
import { useTheme } from "next-themes";
import { headerAnimations } from "./hooks/useHeaderAnimations";

interface HeaderMobileMenuEnhancedProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isActiveRoute: (href: string) => boolean;
  mounted: boolean;
}

export function HeaderMobileMenuEnhanced({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isActiveRoute,
  mounted,
}: HeaderMobileMenuEnhancedProps) {
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  // Theme
  const { theme, setTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  // State
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setExpandedMenus(new Set());
    setSearchQuery("");
  }, [pathname, setIsMobileMenuOpen]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Handle click outside
  useEffect(() => {
    if (!mounted || !isMobileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        !target?.closest?.("[data-mobile-menu-trigger]")
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen, mounted, setIsMobileMenuOpen]);



  const toggleMegaMenu = useCallback((menuKey: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuKey)) {
        next.delete(menuKey);
      } else {
        next.add(menuKey);
      }
      return next;
    });
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setIsMobileMenuOpen(false);
      }
    },
    [searchQuery, router, setIsMobileMenuOpen]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Animation variants with reduced motion support


  const overlayVariants = useMemo(
    () => ({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2, ease: 'easeOut' as const },
    }),
    []
  );



  // Enhanced Animation variants
  const menuVariants = useMemo(
    () =>
      shouldReduceMotion
        ? {
            initial: { x: "100%", opacity: 0 },
            animate: { x: 0, opacity: 1 },
            exit: { x: "100%", opacity: 0 },
          }
        : {
            initial: { x: "100%" },
            animate: { 
              x: 0,
              transition: {
                type: "spring" as const,
                damping: 30,
                stiffness: 300
              }
            },
            exit: { 
              x: "100%",
              transition: {
                type: "spring" as const,
                damping: 30,
                stiffness: 300
              }
            },
          },
    [shouldReduceMotion]
  );
  
  const staggerContainer = useMemo(
      () => ({
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.2,
          },
        },
      }),
      []
    );

  const staggerItem = useMemo(
    () => ({
      hidden: { opacity: 0, x: 20 },
      show: {
        opacity: 1,
        x: 0,
        transition: {
          type: "spring" as const,
          stiffness: 260,
          damping: 20,
        },
      },
    }),
    []
  );

  // All navigation items including "More"
  const allNavItems = useMemo(() => {
    const items = [...mainNavItemsWithMegaMenu];
    return items;
  }, []);

  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <motion.div
            {...overlayVariants}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <motion.div
            ref={mobileMenuRef}
            {...menuVariants}
            className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-background/95 backdrop-blur-2xl z-50 overflow-hidden lg:hidden flex flex-col shadow-2xl border-l border-border/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <h2 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-l from-foreground to-foreground/70">
                    ثانوية بذكاء
                  </h2>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors duration-300"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 scrollbar-track-transparent">
              
              {/* Search */}
              <div className="px-5 py-4">
                <form onSubmit={handleSearch} className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl -m-1 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="ابحث عن دروس، مسابقات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={cn(
                      "w-full ps-11 pe-4 h-12 rounded-2xl bg-muted/50 border-transparent focus:bg-background transition-all duration-300 shadow-sm text-start",
                      isSearchFocused && "ring-2 ring-primary/20 border-primary/20 shadow-lg shadow-primary/5"
                    )}
                  />
                  <Search className={cn(
                    "absolute start-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors duration-300",
                    isSearchFocused && "text-primary"
                  )} />
                </form>
              </div>

            {/* User Profile Section removed */}


            {/* Navigation */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="px-4 pb-8 space-y-2"
            >
              {/* Quick Navigation */}
              <motion.div variants={staggerItem}>
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                    isActiveRoute("/")
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-accent active:scale-[0.98]"
                  )}
                >
                  <Home className="h-5 w-5" />
                  <span className="font-medium">الرئيسية</span>
                </Link>
              </motion.div>

              {allNavItems.map((item) => {
                const isActive = mounted && isActiveRoute(item.href);
                const menuKey = item.href;
                const isExpanded = expandedMenus.has(menuKey);
                const hasMegaMenu = item.megaMenu && item.megaMenu.length > 0;

                return (
                  <motion.div key={item.href} variants={staggerItem}>
                    {hasMegaMenu ? (
                      <div className="space-y-1">
                        <button
                          onClick={() => toggleMegaMenu(menuKey)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 p-3.5 rounded-xl transition-all duration-300 border border-transparent",
                            isActive
                              ? "bg-primary/10 text-primary font-bold shadow-sm border-primary/10"
                              : "hover:bg-muted font-medium text-foreground/80 hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                              isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-background"
                            )}>
                              <item.icon className="h-4 w-4" />
                            </div>
                            <span className="text-[15px]">{item.label}</span>
                            {item.badge && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-primary to-primary/80 text-white rounded-full shadow-sm shadow-primary/20">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn(isExpanded ? "text-primary" : "text-muted-foreground")}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                              className="overflow-hidden"
                            >
                              <div className="ms-4 ps-4 border-s-2 border-primary/10 space-y-1 py-1 my-1">
                                {item.megaMenu?.map((category, catIndex) => (
                                  <div key={catIndex} className="space-y-1">
                                    {catIndex > 0 && (
                                      <div className="h-px bg-border/40 my-3 w-3/4 mx-auto" />
                                    )}
                                    {category.items.map((subItem) => {
                                      const subIsActive = mounted && isActiveRoute(subItem.href);
                                      return (
                                        <Link
                                          key={subItem.href}
                                          href={subItem.href}
                                          onClick={() => setIsMobileMenuOpen(false)}
                                          className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                                            subIsActive
                                              ? "bg-primary/10 text-primary font-bold"
                                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                          )}
                                        >
                                          <subItem.icon className="h-4 w-4 opacity-70" />
                                          <span className="flex-1">{subItem.label}</span>
                                          {subItem.badge && (
                                            <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-bold">
                                              {subItem.badge}
                                            </span>
                                          )}
                                        </Link>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 border border-transparent",
                          isActive
                            ? "bg-primary/10 text-primary font-bold shadow-sm border-primary/10"
                            : "hover:bg-muted font-medium text-foreground/80 hover:text-foreground"
                        )}
                      >
                         <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                            isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-background"
                          )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-[15px]">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-primary to-primary/80 text-white rounded-full shadow-sm shadow-primary/20">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )}
                  </motion.div>
                );
              })}

              {/* More Menu Items */}
              <motion.div variants={staggerItem}>
                <div className="space-y-1">
                  <button
                    onClick={() => toggleMegaMenu("more")}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 p-3.5 rounded-xl transition-all duration-300",
                      expandedMenus.has("more")
                        ? "bg-muted/80 text-foreground font-semibold"
                        : "hover:bg-muted font-medium text-foreground/80"
                    )}
                  >
                     <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                     </div>
                    <span className="text-[15px]">المزيد</span>
                    <motion.div
                      animate={{ rotate: expandedMenus.has("more") ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={expandedMenus.has("more") ? "text-foreground" : "text-muted-foreground"}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.has("more") && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                      >
                        <div className="ms-4 ps-4 border-s-2 border-border/50 space-y-1 py-1 my-1">
                          {moreMegaMenu.map((category, catIndex) => (
                            <div key={catIndex} className="space-y-1">
                              {catIndex > 0 && <div className="h-px bg-border/40 my-3 w-3/4 mx-auto" />}
                              {category.items.map((subItem) => {
                                const subIsActive = mounted && isActiveRoute(subItem.href);
                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                                      subIsActive
                                        ? "bg-primary/10 text-primary font-bold"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                  >
                                    <subItem.icon className="h-4 w-4 opacity-70" />
                                    <span className="flex-1">{subItem.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
            </div>

            {/* Footer Actions simplified */}
            <div className="p-5 border-t border-border/40 space-y-4 bg-muted/20 backdrop-blur-sm mt-auto">
              <Button
                variant="outline"
                onClick={toggleTheme}
                className="w-full justify-between bg-background/50 border-border/50 h-10 rounded-xl"
              >
                <span className="text-sm font-medium">المظهر</span>
                {theme === "dark" ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Moon className="h-4 w-4" />
                    <span className="text-xs">داكن</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-500">
                    <Sun className="h-4 w-4" />
                    <span className="text-xs">فاتح</span>
                  </div>
                )}
              </Button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default HeaderMobileMenuEnhanced;
