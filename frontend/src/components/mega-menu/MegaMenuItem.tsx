"use client";

import React, { useEffect, useRef, memo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NavItem } from "./types";

interface MegaMenuItemProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  isCompact?: boolean;
  isFocused?: boolean;
}

export const MegaMenuItem = memo(function MegaMenuItem({
  item,
  isActive,
  onClick,
  isCompact = false,
  isFocused = false,
}: MegaMenuItemProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isFocused && linkRef.current) {
      linkRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      linkRef.current.focus();
    }
  }, [isFocused]);

  const isExternal = item.href?.startsWith("http") || item.href?.startsWith("//");

  return (
    <div role="listitem">
      <Link
        ref={linkRef}
        href={item.href}
        onClick={onClick}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "block rounded-md px-2 py-1.5 leading-snug",
          isCompact ? "text-xs md:text-sm" : "text-sm md:text-base",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isActive
            ? "text-primary font-semibold"
            : "text-foreground/80 hover:text-primary hover:bg-primary/5"
        )}
      >
        {item.label}
      </Link>
    </div>
  );
});

MegaMenuItem.displayName = "MegaMenuItem";
