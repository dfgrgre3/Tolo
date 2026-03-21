"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, Search, X, Moon, Sun, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { mainNavItemsWithMegaMenu, moreMegaMenu } from "@/components/mega-menu/navData";
import { buildMobileNavItems, buildMobileSearchResultsWithExtras, type MobileSearchResult } from "./headerMenuUtils";
import { HeaderNavLink, HeaderMenuTrigger } from "@/components/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/auth-context";
import { LogIn, UserPlus, LogOut } from "lucide-react";
import { buildLoginUrl } from "@/lib/auth/navigation";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const { user, logout, isLoading } = useAuth();

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    setExpandedMenus(new Set());
    setSearchQuery("");
  }, [setIsMobileMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!mounted || !isMobileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        !target?.closest?.("[data-mobile-menu-trigger]")
      ) {
        closeMobileMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeMobileMenu, isMobileMenuOpen, mounted]);

  const toggleMegaMenu = useCallback((menuKey: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuKey)) next.delete(menuKey);
      else next.add(menuKey);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const overlayVariants = useMemo(
    () => ({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2, ease: "easeOut" as const } }),
    []
  );

  const menuVariants = useMemo(
    () =>
      shouldReduceMotion
        ? { initial: { x: "100%", opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: "100%", opacity: 0 } }
        : {
            initial: { x: "100%" },
            animate: { x: 0, transition: { type: "spring" as const, damping: 30, stiffness: 300 } },
            exit: { x: "100%", transition: { type: "spring" as const, damping: 30, stiffness: 300 } },
          },
    [shouldReduceMotion]
  );

  const staggerContainer = useMemo(
    () => ({ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }),
    []
  );

  const staggerItem = useMemo(
    () => ({ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 260, damping: 20 } } }),
    []
  );

  const allNavItems = useMemo(() => buildMobileNavItems(mainNavItemsWithMegaMenu), []);

  const searchResults = useMemo<MobileSearchResult[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return buildMobileSearchResultsWithExtras(allNavItems, [{ label: "المزيد", categories: moreMegaMenu }])
      .filter((entry) => {
        return (
          entry.label.toLowerCase().includes(query) ||
          entry.href.toLowerCase().includes(query) ||
          entry.section?.toLowerCase().includes(query)
        );
      })
      .slice(0, 12);
  }, [allNavItems, searchQuery]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchResults.length === 0) return;
      router.push(searchResults[0].href);
      closeMobileMenu();
    },
    [closeMobileMenu, router, searchResults]
  );

  const loginUrl = useMemo(() => {
    const query = searchParams.toString();
    return buildLoginUrl(`${pathname || "/"}${query ? `?${query}` : ""}`);
  }, [pathname, searchParams]);

  const renderNavLink = useCallback(
    (item: MobileSearchResult, onClick: () => void) => (
      <HeaderNavLink
        href={item.href}
        label={item.label}
        icon={item.icon}
        badge={item.badge}
        active={mounted && isActiveRoute(item.href)}
        variant="search"
        onClick={onClick}
      />
    ),
    [isActiveRoute, mounted]
  );

  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          <motion.div {...overlayVariants} className="fixed inset-0 bg-black/60 dark:bg-black/80 z-40 lg:hidden backdrop-blur-sm" onClick={closeMobileMenu} />
          <motion.div
            ref={mobileMenuRef}
            {...menuVariants}
            className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-background/95 backdrop-blur-2xl z-50 overflow-hidden lg:hidden flex flex-col shadow-2xl border-l border-border/40"
          >
            <div className="flex items-center justify-between p-4 pb-2 border-b border-border/20">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
                  <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white border border-primary/20 shadow-lg shadow-primary/20">
                    <Image src="/logo-tolo.jpg" alt="TOLO" width={36} height={36} className="h-full w-full object-cover" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <h2 className="font-bold text-base bg-clip-text text-transparent bg-gradient-to-l from-foreground to-foreground/70">TOLO</h2>
                  <span className="text-[10px] text-muted-foreground font-medium">المستقبل يبدأ هنا</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closeMobileMenu} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors duration-300 h-9 w-9">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 scrollbar-track-transparent -webkit-overflow-scrolling: touch">
              <div className="px-4 py-3">
                <form onSubmit={handleSearch} className="relative group">
                  <div className="absolute inset-0 bg-primary/5 rounded-2xl -m-1 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="ابحث داخل التنقل..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={cn(
                      "w-full ps-10 pe-3 h-11 rounded-2xl bg-muted/50 border-transparent focus:bg-background transition-all duration-300 shadow-sm text-start text-base",
                      isSearchFocused && "ring-2 ring-primary/20 border-primary/20 shadow-lg shadow-primary/5"
                    )}
                  />
                  <Search className={cn("absolute start-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground transition-colors duration-300", isSearchFocused && "text-primary")} />
                </form>
              </div>

              <div className="px-4 py-2">
                {isLoading ? (
                  <div className="h-16 w-full rounded-2xl bg-muted animate-pulse" />
                ) : user ? (
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-10 w-10 border-2 border-background shadow-md">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">{user.name?.[0] || user.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-sm truncate text-foreground">{user.name || user.username}</span>
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive" onClick={() => { logout(); closeMobileMenu(); }}>
                        <LogOut className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button variant="outline" className="rounded-2xl h-10 border-primary/20 hover:bg-primary/5 text-primary gap-1.5 transition-all font-bold text-sm" asChild>
                      <Link href={loginUrl} onClick={closeMobileMenu}>
                        <LogIn className="h-3.5 w-3.5" />
                        دخول
                      </Link>
                    </Button>
                    <Button className="rounded-2xl h-10 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-lg shadow-primary/20 transition-all font-bold text-sm" asChild>
                      <Link href="/register" onClick={closeMobileMenu}>
                        <UserPlus className="h-3.5 w-3.5" />
                        اشتراك
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="px-3 pb-6 space-y-2">
                {searchQuery.trim() ? (
                  <motion.div variants={staggerItem} className="space-y-1.5">
                    {searchResults.length > 0 ? (
                      searchResults.map((result) => renderNavLink(result, closeMobileMenu))
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة</div>
                    )}
                  </motion.div>
                ) : (
                  <>
                    <motion.div variants={staggerItem}>
                        <HeaderNavLink
                          href="/"
                          label="الرئيسية"
                          icon={Home}
                          active={mounted && isActiveRoute("/")}
                          variant="mobile"
                          onClick={closeMobileMenu}
                        />
                      </motion.div>

                    {allNavItems.map((item) => {
                      const active = mounted && isActiveRoute(item.href);
                      const hasMegaMenu = !!item.megaMenu?.length;
                      return (
                        <motion.div key={item.href} variants={staggerItem}>
                          {hasMegaMenu ? (
                            <div className="space-y-1">
                              <button
                                onClick={() => toggleMegaMenu(item.href)}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2.5 p-3 rounded-xl transition-all duration-300 border border-transparent touch-manipulation",
                                  active ? "bg-primary/10 text-primary font-bold shadow-sm border-primary/10" : "hover:bg-muted font-medium text-foreground/80 hover:text-foreground"
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={cn("flex items-center justify-center w-7 h-7 rounded-lg transition-colors", active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                                    <item.icon className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-sm">{item.label}</span>
                                  {item.badge && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-primary to-primary/80 text-white rounded-full shadow-sm shadow-primary/20">{item.badge}</span>}
                                </div>
                                <motion.div animate={{ rotate: expandedMenus.has(item.href) ? 180 : 0 }} transition={{ duration: 0.2 }} className={expandedMenus.has(item.href) ? "text-primary" : "text-muted-foreground"}>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </motion.div>
                              </button>
                              <AnimatePresence>
                                {expandedMenus.has(item.href) && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden">
                                    <div className="ms-3 ps-3 border-s-2 border-primary/10 space-y-1 py-1 my-1">
                                      {item.megaMenu?.map((category, catIndex) => (
                                        <div key={catIndex} className="space-y-1">
                                          {catIndex > 0 && <div className="h-px bg-border/40 my-2 w-3/4 mx-auto" />}
                                          {category.items.map((subItem) => {
                                            const subActive = mounted && isActiveRoute(subItem.href);
                                            return (
                                              <Link
                                                key={`${subItem.href}-${subItem.label}`}
                                                href={subItem.href}
                                                onClick={closeMobileMenu}
                                                className={cn(
                                                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 touch-manipulation",
                                                  subActive ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                )}
                                              >
                                                <subItem.icon className="h-3.5 w-3.5 opacity-70" />
                                                <span className="flex-1 text-sm">{subItem.label}</span>
                                                {subItem.badge && <span className="px-1 py-0.5 text-[9px] bg-primary/10 text-primary rounded-full font-bold">{subItem.badge}</span>}
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
                            <HeaderNavLink
                              href={item.href}
                              label={item.label}
                              icon={item.icon}
                              badge={item.badge}
                              active={active}
                              variant="mobile"
                              onClick={closeMobileMenu}
                            />
                          )}
                        </motion.div>
                      );
                    })}

                    <motion.div variants={staggerItem}>
                      <div className="space-y-1">
                        <HeaderMenuTrigger
                          label="المزيد"
                          isOpen={expandedMenus.has("more")}
                          onClick={() => toggleMegaMenu("more")}
                          className={cn(
                            "w-full justify-between gap-2.5 p-3 rounded-xl touch-manipulation",
                            expandedMenus.has("more") ? "bg-muted/80 text-foreground font-semibold" : "hover:bg-muted font-medium text-foreground/80"
                          )}
                        />

                        <AnimatePresence>
                          {expandedMenus.has("more") && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden">
                              <div className="ms-3 ps-3 border-s-2 border-border/50 space-y-1 py-1 my-1">
                                {moreMegaMenu.map((category, catIndex) => (
                                  <div key={catIndex} className="space-y-1">
                                    {catIndex > 0 && <div className="h-px bg-border/40 my-2 w-3/4 mx-auto" />}
                                    {category.items.map((subItem) => {
                                      const subActive = mounted && isActiveRoute(subItem.href);
                                      return (
                                        <HeaderNavLink
                                          key={subItem.href}
                                          href={subItem.href}
                                          label={subItem.label}
                                          icon={subItem.icon}
                                          badge={subItem.badge}
                                          active={subActive}
                                          variant="search"
                                          onClick={closeMobileMenu}
                                        />
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
                  </>
                )}
              </motion.div>
            </div>

            <div className="p-4 border-t border-border/40 space-y-3 bg-muted/20 backdrop-blur-sm mt-auto">
              <Button variant="outline" onClick={toggleTheme} className="w-full justify-between bg-background/50 border-border/50 h-9 rounded-xl text-sm">
                <span className="text-sm font-medium">المظهر</span>
                {theme === "dark" ? (
                  <div className="flex items-center gap-1.5 text-primary">
                    <Moon className="h-3.5 w-3.5" />
                    <span className="text-xs">داكن</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-orange-500">
                    <Sun className="h-3.5 w-3.5" />
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

