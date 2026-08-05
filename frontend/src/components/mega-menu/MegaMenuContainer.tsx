"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";

interface MegaMenuContainerProps {
  children: React.ReactNode;
  menuWidth?: string;
  className?: string;
  /** معرف فريد للربط مع aria-labelledby */
  labelledBy?: string;
  /** وصف ديناميكي للقائمة (يُستخدم فقط إذا لم يتوفر labelledBy) */
  ariaLabel?: string;
}

export const MegaMenuContainer = memo(function MegaMenuContainer({ 
  children, 
  menuWidth = "max-w-7xl", 
  className,
  labelledBy,
  ariaLabel,
}: MegaMenuContainerProps) {
  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50 overflow-hidden",
        className
      )}
      style={{ top: 'var(--header-height, 64px)' }} // Fallback آمن
      data-mega-menu-container // تمييز واضح عن المحتوى الداخلي
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={!labelledBy ? (ariaLabel || "القائمة الموسعة") : undefined}
    >
      <div 
        className={cn(
          "relative bg-background border-b border-border shadow-xl",
          "overflow-hidden contain-layout"
        )}
      >
        {/* إضاءة محيطية (بدون will-change) */}
        <div 
          className="absolute -top-24 right-1/4 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-24 left-1/4 w-[24rem] h-[24rem] bg-amber-500/[0.06] rounded-full blur-[120px] pointer-events-none" 
          aria-hidden="true" 
        />

        {/* خط علوي تزييني */}
        <div 
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" 
          aria-hidden="true" 
        />

        {/* حاوية المحتوى */}
        <div className={cn("mx-auto relative z-10 flex flex-col min-h-[12rem] w-full px-4 py-6", menuWidth)}>
          {children}
        </div>
      </div>
    </div>
  );
});