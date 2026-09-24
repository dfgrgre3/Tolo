"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";

interface MegaMenuContainerProps {
  children: React.ReactNode;
  menuWidth?: string;
  className?: string;
}

export const MegaMenuContainer = memo(function MegaMenuContainer({
  children,
  menuWidth = "max-w-7xl",
  className,
}: MegaMenuContainerProps) {
  return (
    <div
      // لا يحدد موضعه بنفسه — الحاوية الأب (MegaMenu) هي التي تثبّته أسفل الـ Header مباشرة.
      // اسم القائمة يضعه MegaMenu على الغلاف الخارجي (role="navigation" + aria-label)؛
      // وضع aria-label هنا أيضاً كان بلا role فلا ينطقه قارئ الشاشة أصلاً.
      className={cn("w-full bg-background border-b border-border overflow-hidden", className)}
      data-mega-menu-container
    >
      <div className={cn("header-dropdown-scroll mx-auto w-full py-6 max-h-[calc(100dvh-var(--header-bottom,64px)-1rem)] overflow-auto overscroll-contain", menuWidth)}>
        {children}
      </div>
    </div>
  );
});
