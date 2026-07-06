"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MegaMenuContainerProps {
  children: React.ReactNode;
  menuWidth: string;
}

export function MegaMenuContainer({ children, menuWidth }: MegaMenuContainerProps) {
  return (
    <div
      className="fixed left-0 right-0 z-50 overflow-hidden"
      style={{ top: 'var(--header-height)' }}
      data-mega-menu-content
      role="dialog"
      aria-modal="true"
      aria-label="القائمة الرئيسية"
    >
      <div className="relative bg-background dark:bg-[#09090b] border-b border-border shadow-[0_24px_70px_-20px_rgba(0,0,0,0.45),0_0_60px_-20px_hsl(var(--primary)_/_0.18)] dark:shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85),0_0_70px_-20px_hsl(var(--primary)_/_0.3)] overflow-hidden">
        {/* Ambient lighting - optimized with will-change */}
        <div className="absolute -top-24 right-1/4 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none will-change-[transform]" />
        <div className="absolute -bottom-24 left-1/4 w-[24rem] h-[24rem] bg-amber-500/[0.06] rounded-full blur-[120px] pointer-events-none will-change-[transform]" />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/70 to-transparent shadow-[0_0_18px_hsl(var(--primary)_/_0.45)]" />

        <div className={cn("mx-auto relative z-10 flex flex-col min-h-[200px] w-full", menuWidth)}>
          {children}
        </div>
      </div>
    </div>
  );
}
