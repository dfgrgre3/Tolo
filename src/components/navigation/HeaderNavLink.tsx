"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
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
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: string;
  variant?: HeaderNavLinkVariant;
  onClick?: () => void;
  description?: string;
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
      {variant === "mega" && <motion.div className={navLayoutStyles.megaItemGlow} initial={false} />}
      {variant === "mega" && active && (
        <motion.div className={navLayoutStyles.megaItemActiveBar} layoutId="activeMegaMenuItem" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
      )}

      <div className={cn(navIconWrapStyles({ variant, active, compact: isCompact }))}>
        <motion.div
          whileHover={variant === "mega" ? { scale: 1.12, rotate: [0, -8] } : undefined}
          whileTap={variant === "mega" ? { scale: 0.9 } : undefined}
          transition={variant === "mega" ? { scale: { type: "spring", stiffness: 400, damping: 17 }, rotate: { type: "tween", duration: 0.3, ease: "easeInOut" } } : undefined}
          className={cn(navIconStyles({ variant, active, compact: isCompact }))}
        >
          <Icon className={variant === "mega" ? (isCompact ? "h-3 w-3" : "h-3.5 w-3.5") : "h-4 w-4"} />
        </motion.div>
      </div>

      <div className="flex-1 min-w-0 z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(navTextStyles({ variant, active, compact: isCompact }))}>{label}</span>
          {badge && <motion.span initial={variant === "mega" ? { scale: 0, rotate: -180 } : false} animate={variant === "mega" ? { scale: 1, rotate: 0 } : undefined} transition={variant === "mega" ? { type: "spring", stiffness: 200, damping: 15 } : undefined} className={cn(navBadgeStyles({ variant, compact: isCompact }))}>{badge}</motion.span>}
        </div>
        {variant === "mega" && description && !isCompact && <span className="text-muted-foreground line-clamp-1 leading-snug transition-colors duration-300 group-hover/item:text-foreground/90 text-xs md:text-sm mt-0.5">{description}</span>}
      </div>
    </Link>
  );
}

