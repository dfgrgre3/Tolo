"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  navBadgeStyles,
  navIconStyles,
  navIconWrapStyles,
  navLayoutStyles,
  navLinkStyles,
  navTextStyles,
} from "./navigationTokens";

type HeaderNavLinkVariant = "desktop" | "mobile" | "search" | "mega";

interface HeaderNavLinkProps {
  href: string;
  label: React.ReactNode;
  icon: LucideIcon;
  active?: boolean;
  badge?: string;
  variant?: HeaderNavLinkVariant;
  onClick?: () => void;
  description?: React.ReactNode;
  isCompact?: boolean;
  external?: boolean;
}

export function HeaderNavLink({
  href,
  label,
  icon: Icon,
  active = false,
  badge,
  variant = "desktop",
  onClick,
  description,
  isCompact = false,
  external = false,
}: HeaderNavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      prefetch={variant === "desktop" ? true : undefined}
      className={cn(navLinkStyles({ variant, active }))}
      aria-current={active ? "page" : undefined}
    >
      {variant === "mega" && <div className={navLayoutStyles.megaItemGlow} />}
      {variant === "mega" && active && (
        <div className={navLayoutStyles.megaItemActiveBar} />
      )}

      <div className={cn(navIconWrapStyles({ variant, active, compact: isCompact }))}>
        <div className={cn(navIconStyles({ variant, active, compact: isCompact }))}>
          <Icon className={variant === "mega" ? (isCompact ? "h-3 w-3" : "h-3.5 w-3.5") : "h-4 w-4"} />
        </div>
      </div>

      <div className="flex-1 min-w-0 z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(navTextStyles({ variant, active, compact: isCompact }))}>{label}</span>
          {badge && <span className={cn(navBadgeStyles({ variant, compact: isCompact }))}>{badge}</span>}
        </div>
        {variant === "mega" && description && !isCompact && <span className="text-muted-foreground line-clamp-1 leading-snug group-hover/item:text-foreground/90 text-xs md:text-sm mt-0.5">{description}</span>}
      </div>
    </Link>
  );
}

