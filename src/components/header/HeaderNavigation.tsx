"use client";

import React from "react";
import { MegaMenu } from "@/components/mega-menu";
import { mainNavItemsWithMegaMenu, moreMegaMenu } from "@/components/mega-menu/navData";
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
  return (
    <nav className="hidden lg:flex items-center gap-2 flex-1 justify-center" aria-label="القائمة الرئيسية">
      {mainNavItemsWithMegaMenu.map((item) => {
        const menuKey = item.href;
        const isOpen = openMegaMenu === menuKey;
        const isActive = mounted && isActiveRoute(item.href);

        if (item.megaMenu && item.megaMenu.length > 0) {
          return (
            <div key={item.href} className="relative group/nav-item" data-mega-menu-wrapper="true">
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
                  "hover:bg-white/5 hover:text-primary",
                  isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-gray-400 border border-transparent",
                  isOpen && "bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] border-primary/40"
                )}
              />

              {item.badge && mounted && (
                <div className="absolute -top-1 -right-1 pointer-events-none">
                  <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-ping" />
                  <span className="relative h-4 px-2 bg-primary text-black text-[9px] font-black italic rounded-full flex items-center justify-center border border-black shadow-[0_0_10px_rgba(var(--primary),0.5)]">
                    {item.badge}
                  </span>
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={item.href} className="relative">
            <HeaderNavLink
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              active={isActive}
              variant="desktop"
            />
          </div>
        );
      })}

      <div className="relative group" data-mega-menu-wrapper="true">
        <MegaMenu
          categories={moreMegaMenu}
          isOpen={openMegaMenu === "more"}
          onClose={() => setOpenMegaMenu(null)}
          onOpen={() => setOpenMegaMenu("more")}
          activeRoute={isActiveRoute}
          label="المزيد"
          user={user}
          className={cn(
            "relative h-11 px-6 flex items-center gap-3 transition-all duration-300 rounded-[1.25rem] font-black uppercase text-[11px] tracking-widest",
            "hover:bg-white/5 hover:text-primary text-gray-400 border border-transparent",
            openMegaMenu === "more" && "bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] border-primary/40"
          )}
        />
      </div>
    </nav>
  );
}
