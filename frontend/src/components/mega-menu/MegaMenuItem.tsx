"use client";

import React, { useMemo, useEffect, useRef, memo } from "react";
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

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5 font-bold transition-all duration-300">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function highlightMatch(item: NavItem, query: string) {
  if (!query.trim()) return { label: item.label, description: item.description };
  return {
    label: highlightText(item.label, query),
    description: item.description ? highlightText(item.description, query) : undefined,
  };
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
    <div role="listitem">
      <div 
        ref={itemRef} 
        tabIndex={-1}
        className="outline-none focus:ring-2 focus:ring-primary/60 focus:bg-primary/5 rounded-xl block shadow-sm"
      >
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
    </div>
  );

});

MegaMenuItem.displayName = "MegaMenuItem";
