"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  navBadgeStyles,
  navIconStyles,
  navIconWrapStyles,
  navLinkStyles,
  navTextStyles,
} from "./navigationTokens";

type HeaderNavLinkVariant = "desktop" | "mobile" | "search";

interface HeaderNavLinkProps {
  href: string;
  label: React.ReactNode;
  /** اختياري — لا يتم عرض أي أيقونة إن لم يمرر */
  icon?: LucideIcon;
  active?: boolean;
  badge?: string;
  variant?: HeaderNavLinkVariant;
  onClick?: () => void;
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
      {Icon && (
        <div className={cn(navIconWrapStyles({ variant, active }))}>
          <div className={cn(navIconStyles({ variant, active }))}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(navTextStyles({ variant, active }))}>{label}</span>
          {badge && <span className={cn(navBadgeStyles({ variant }))}>{badge}</span>}
        </div>
      </div>
    </Link>
  );
}
