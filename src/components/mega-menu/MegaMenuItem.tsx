"use client";

import React, { useMemo, useEffect, useRef, memo } from "react";
import { motion } from "framer-motion";
import { NavItem } from "./types";
import { HeaderNavLink } from "@/components/navigation";

interface MegaMenuItemProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  delay?: number;
  isCompact?: boolean;
  searchQuery?: string;
  isFocused?: boolean;
}

function highlightMatch(item: NavItem, query: string) {
  if (!query.trim()) return { label: item.label, description: item.description };
  const lower = query.toLowerCase();
  const matches = item.label.toLowerCase().includes(lower) || item.description?.toLowerCase().includes(lower) || item.href.toLowerCase().includes(lower);
  return { label: item.label, description: item.description, matches };
}

export const MegaMenuItem = memo(function MegaMenuItem({
  item,
  isActive,
  onClick,
  delay = 0,
  isCompact = false,
  searchQuery = "",
  isFocused = false,
}: MegaMenuItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      itemRef.current.focus();
    }
  }, [isFocused]);

  const { label, description } = useMemo(() => highlightMatch(item, searchQuery), [item, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02, x: 2 }}
      whileTap={{ scale: 0.98 }}
      role="listitem"
    >
      <div ref={itemRef} tabIndex={-1}>
        <HeaderNavLink
          href={item.href}
          label={label}
          icon={item.icon}
          badge={item.badge}
          active={isActive}
          variant="mega"
          onClick={onClick}
          description={description}
          isCompact={isCompact}
          external={item.href?.startsWith("http") || item.href?.startsWith("//")}
        />
      </div>
    </motion.div>
  );
});

MegaMenuItem.displayName = "MegaMenuItem";
