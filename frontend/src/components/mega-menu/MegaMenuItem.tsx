"use client";

import React, { memo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NavItem } from "./types";
import { repairMojibake } from "@/lib/i18n/repair-mojibake";

interface MegaMenuItemProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  isCompact?: boolean;
}

export const MegaMenuItem = memo(function MegaMenuItem({
  item,
  isActive,
  onClick,
  isCompact = false,
}: MegaMenuItemProps) {
  const isExternal = item.href?.startsWith("http") || item.href?.startsWith("//");

  return (
    <li>
      <Link
        href={item.href}
        onClick={onClick}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "inline-flex w-fit rounded-md px-2 py-1.5 leading-snug",
          isCompact ? "text-xs md:text-sm" : "text-sm md:text-base",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isActive
            ? "text-primary font-semibold"
            : "text-foreground/80 hover:text-primary hover:bg-primary/5"
        )}
      >
        {repairMojibake(item.label)}
      </Link>
    </li>
  );
});

MegaMenuItem.displayName = "MegaMenuItem";
