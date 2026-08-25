"use client";

import React from "react";
import { MegaMenu } from "@/components/mega-menu";
import { mainNavItemsWithMegaMenu, type NavItemWithMegaMenu } from "@/components/mega-menu/navData";
import { cn } from "@/lib/utils";
import { User } from "@/types/user";
import { HeaderNavLink } from "@/components/navigation";

interface HeaderNavigationProps {
  openMegaMenu: string | null;
  setOpenMegaMenu: React.Dispatch<React.SetStateAction<string | null>>;
  isActiveRoute: (href: string) => boolean;
  mounted: boolean;
  user?: User | null;
  navItems?: NavItemWithMegaMenu[];
}

export function HeaderNavigation({
  openMegaMenu,
  setOpenMegaMenu,
  isActiveRoute,
  user,
  navItems = mainNavItemsWithMegaMenu,
}: HeaderNavigationProps) {
  return (
    <nav 
      className="hidden lg:flex items-center gap-2 flex-1 justify-center relative" 
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
                  badge={item.badge}
                  user={user}
                  className={cn(
                    "relative h-11 px-6 flex items-center gap-3 rounded-[1.25rem] font-black text-[13px] tracking-normal transition-colors duration-200",
                    isActiveRoute(item.href) ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground border border-transparent hover:text-primary hover:bg-primary/5",
                    openMegaMenu === item.href && "bg-primary/20 text-primary shadow-[0_0_20px_hsl(var(--primary)_/_0.3)] border-primary/40"
                  )}
                />
              ) : (
                <HeaderNavLink
                  href={item.href}
                  label={item.label}
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