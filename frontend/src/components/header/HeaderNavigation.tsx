"use client";

import React, { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { MegaMenu } from "@/components/mega-menu";
import { mainNavItemsWithMegaMenu } from "@/components/mega-menu/navData";
import { cn } from "@/lib/utils";
import { User } from "@/types/user";
import { HeaderNavLink } from "@/components/navigation";

interface HeaderNavigationProps {
  openMegaMenu: string | null;
  setOpenMegaMenu: (key: string | null) => void;
  isActiveRoute: (href: string) => boolean;
  mounted: boolean;
  user?: User | null;
}

export function HeaderNavigation({
  openMegaMenu,
  setOpenMegaMenu,
  isActiveRoute,
  mounted,
  user,
}: HeaderNavigationProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <nav 
      className="hidden lg:flex items-center gap-2 flex-1 justify-center relative" 
      aria-label="القائمة الرئيسية"
      onMouseLeave={() => setHoveredKey(null)}
    >
      {mainNavItemsWithMegaMenu.map((item) => {
        const menuKey = item.href;
        const isOpen = openMegaMenu === menuKey;
        const isActive = mounted && isActiveRoute(item.href);
        const isHovered = hoveredKey === menuKey;

        return (
          <div
            key={item.href}
            className="relative group/nav-item"
            onMouseEnter={() => setHoveredKey(menuKey)}
            data-mega-menu-wrapper={item.megaMenu && item.megaMenu.length > 0 ? "true" : undefined}
          >
            {/* Sliding Magnetic Bubble Background */}
            <AnimatePresence>
              {isHovered && (
                <m.div
                  layoutId="nav-hover-pill"
                  className="absolute inset-0 bg-primary/8 dark:bg-primary/10 rounded-[1.25rem] border border-primary/20 pointer-events-none z-0"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 28,
                  }}
                />
              )}
            </AnimatePresence>

            <div className="relative z-10">
              {item.megaMenu && item.megaMenu.length > 0 ? (
                <MegaMenu
                  categories={item.megaMenu}
                  isOpen={isOpen}
                  onClose={() => setOpenMegaMenu(null)}
                  onOpen={() => setOpenMegaMenu(menuKey)}
                  activeRoute={isActiveRoute}
                  label={item.label}
                  user={user}
                  className={cn(
                    "relative h-11 px-6 flex items-center gap-3 transition-all duration-300 rounded-[1.25rem] font-black uppercase text-[11px] tracking-widest",
                    isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-gray-400 border border-transparent hover:text-primary",
                    isOpen && "bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] border-primary/40"
                  )}
                />
              ) : (
                <HeaderNavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                  active={isActive}
                  variant="desktop"
                />
              )}
            </div>

            {item.badge && mounted && (
              <div className="absolute -top-1 -right-1 pointer-events-none z-20">
                <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-ping" />
                <span className="relative h-4 px-2 bg-primary text-black text-[9px] font-black italic rounded-full flex items-center justify-center border border-black shadow-[0_0_10px_rgba(var(--primary),0.5)]">
                  {item.badge}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

