"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

interface MegaMenuContainerProps {
  children: React.ReactNode;
  menuWidth: string;
}

export function MegaMenuContainer({ children, menuWidth }: MegaMenuContainerProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={menuRef}
      className="fixed left-0 right-0 w-screen z-50 overflow-hidden"
      style={{ top: 'var(--header-height, 64px)' }}
      data-mega-menu-content
      role="dialog"
      aria-modal="true"
      aria-label="القائمة الرئيسية"
    >
      <div className="relative bg-gradient-to-br from-popover/98 via-popover/95 to-popover/98 backdrop-blur-2xl border-b border-border/80 shadow-2xl shadow-black/40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 via-primary/5 to-primary/8 pointer-events-none" />

        <div
          className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary/8 pointer-events-none opacity-60"
        />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}

