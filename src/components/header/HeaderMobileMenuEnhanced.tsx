"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  User,
  Settings,
  LogOut,
  LogIn,
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
import { useUnifiedAuth } from "@/contexts/auth-context";
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
  const { user, logout } = useUnifiedAuth();
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

  // Handlers
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [logout, setIsMobileMenuOpen]);

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
  const menuVariants = useMemo(
    () =>
      shouldReduceMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
          }
        : headerAnimations.mobileMenu,
    [shouldReduceMotion]
  );

  const overlayVariants = useMemo(
    () => ({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2, ease: 'easeOut' as const },
    }),
    []
  );

  const staggerContainer = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05,
          delayChildren: 0.1,
        },
      },
    }),
    []
  );

  const staggerItem = useMemo(
    () => ({
      hidden: { opacity: 0, x: 30 },
      show: {
        opacity: 1,
        x: 0,
        transition: {
          type: 'spring' as const,
          stiffness: 300,
          damping: 24,
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
            className="fixed right-0 top-0 bottom-0 w-[90%] max-w-md bg-background z-50 overflow-hidden lg:hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-l from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">ثانوية بذكاء</h2>
                  <p className="text-xs text-muted-foreground">القائمة الرئيسية</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-full hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border/30">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="البحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className={cn(
                    "w-full pr-10 pl-4 h-11 rounded-xl bg-muted/50 border-0 transition-all duration-300",
                    isSearchFocused && "ring-2 ring-primary/30 bg-background"
                  )}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </form>
            </div>

            {/* User Profile Section (if authenticated) */}
            {user && (
              <div className="p-4 border-b border-border/30">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-l from-accent/50 to-transparent">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                    <AvatarImage src={user.avatar || undefined} alt={user.name || "User"} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold">
                      {user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ||
                        (user.email ? user.email[0].toUpperCase() : "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.name || "مستخدم"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href="/notifications">
                        <Bell className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="flex-1 overflow-y-auto p-4 space-y-2"
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
                  <span>الرئيسية</span>
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
                            "w-full flex items-center justify-between gap-3 p-3 rounded-xl transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-accent active:scale-[0.98]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="pr-4 py-2 space-y-1">
                                {item.megaMenu?.map((category, catIndex) => (
                                  <div key={catIndex} className="space-y-1">
                                    {catIndex > 0 && (
                                      <div className="h-px bg-border/40 my-2" />
                                    )}
                                    {category.items.map((subItem) => {
                                      const subIsActive = mounted && isActiveRoute(subItem.href);
                                      return (
                                        <Link
                                          key={subItem.href}
                                          href={subItem.href}
                                          onClick={() => setIsMobileMenuOpen(false)}
                                          className={cn(
                                            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
                                            subIsActive
                                              ? "bg-primary/10 text-primary font-medium"
                                              : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                                          )}
                                        >
                                          <subItem.icon className="h-4 w-4" />
                                          <span className="flex-1">{subItem.label}</span>
                                          {subItem.badge && (
                                            <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full font-medium">
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
                          "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-accent active:scale-[0.98]"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
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
                      "w-full flex items-center justify-between gap-3 p-3 rounded-xl transition-all duration-200",
                      expandedMenus.has("more")
                        ? "bg-accent"
                        : "hover:bg-accent active:scale-[0.98]"
                    )}
                  >
                    <span>المزيد</span>
                    <motion.div
                      animate={{ rotate: expandedMenus.has("more") ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.has("more") && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pr-4 py-2 space-y-1">
                          {moreMegaMenu.map((category, catIndex) => (
                            <div key={catIndex} className="space-y-1">
                              {catIndex > 0 && <div className="h-px bg-border/40 my-2" />}
                              {category.items.map((subItem) => {
                                const subIsActive = mounted && isActiveRoute(subItem.href);
                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
                                      subIsActive
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    <subItem.icon className="h-4 w-4" />
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

            {/* Footer Actions */}
            <div className="p-4 border-t border-border/30 space-y-3 bg-muted/30">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background">
                <span className="text-sm text-muted-foreground">المظهر</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="gap-2 rounded-full"
                >
                  {theme === "dark" ? (
                    <>
                      <Moon className="h-4 w-4" />
                      <span>داكن</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-4 w-4" />
                      <span>فاتح</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Auth Actions */}
              {user ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                        <User className="h-4 w-4 ml-2" />
                        الملف الشخصي
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                        <Settings className="h-4 w-4 ml-2" />
                        الإعدادات
                      </Link>
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 ml-2" />
                    تسجيل الخروج
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-gradient-to-l from-primary to-primary/80"
                  asChild
                >
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <LogIn className="h-4 w-4 ml-2" />
                    تسجيل الدخول
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default HeaderMobileMenuEnhanced;
