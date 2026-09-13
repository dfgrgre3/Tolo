"use client";

import React from "react";
import { MegaMenu } from "@/components/mega-menu";
import type { NavItemWithMegaMenu } from "@/components/mega-menu/navData";
import { cn } from "@/lib/utils";
import { HeaderNavLink } from "@/components/navigation";

interface HeaderNavigationProps {
  openMegaMenu: string | null;
  setOpenMegaMenu: React.Dispatch<React.SetStateAction<string | null>>;
  isActiveRoute: (href: string) => boolean;
  mounted: boolean;
  navItems: NavItemWithMegaMenu[];
}

export function HeaderNavigation({
  openMegaMenu,
  setOpenMegaMenu,
  isActiveRoute,
  navItems,
}: HeaderNavigationProps) {
  return (
    <nav 
      className="hidden lg:flex items-center gap-1 flex-1 justify-center relative"
      aria-label="القائمة الرئيسية"
    >
      {navItems.map((item) => {

        return (
          <div
            key={item.href}
            className="relative"
            data-mega-menu-wrapper={item.megaMenu && item.megaMenu.length > 0 ? "true" : undefined}
          >
            <div className="relative">
              {item.megaMenu && item.megaMenu.length > 0 ? (
                <MegaMenu
                  categories={item.megaMenu}
                  isOpen={openMegaMenu === item.href}
                  onClose={() => setOpenMegaMenu(null)}
                  onOpen={() => setOpenMegaMenu(item.href)}
                  activeRoute={isActiveRoute}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                  className={cn(
                    "relative h-10 px-4 flex items-center gap-2 rounded-xl font-bold text-xs tracking-normal",
                    isActiveRoute(item.href) ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground border border-transparent hover:text-primary hover:bg-primary/5",
                    openMegaMenu === item.href && "bg-primary/20 text-primary border-primary/40"
                  )}
                />
              ) : (
                <HeaderNavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                  active={isActiveRoute(item.href)}
                  variant="desktop"
                />
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export default HeaderNavigation;
