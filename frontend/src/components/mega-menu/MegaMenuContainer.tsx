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
      // لا يحدد موضعه بنفسه — الحاوية الأب (MegaMenu) هي التي تثبّته أسفل الـ Header مباشرة
      className={cn("w-full bg-background border-b border-border", className)}
      data-mega-menu-container
      aria-labelledby={labelledBy}
      aria-label={!labelledBy ? (ariaLabel || "القائمة الموسعة") : undefined}
    >
      <div className={cn("mx-auto w-full py-6 max-h-[calc(100dvh-var(--header-bottom,64px)-1rem)] overflow-y-auto overscroll-contain", menuWidth)}>
        {children}
      </div>
    </div>
  );
});
