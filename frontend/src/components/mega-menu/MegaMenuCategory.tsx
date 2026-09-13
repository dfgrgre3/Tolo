"use client";

import React, { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { MegaMenuCategory as MegaMenuCategoryType, NavItem as MegaMenuItemType } from "./types";
import { MegaMenuItem } from "./MegaMenuItem";
import { repairMojibake } from "@/lib/i18n/repair-mojibake";
// ==========================================
// Types
// ==========================================

interface MegaMenuCategoryProps {
  category: MegaMenuCategoryType;
  categoryIndex: number;
  onItemClick: (item: MegaMenuItemType, category: MegaMenuCategoryType) => void;
  activeRoute?: (href: string) => boolean;
  isCompact?: boolean;
}

// ==========================================
// Component - نصوص فقط: عنوان القسم + المسارات
// ==========================================

export const MegaMenuCategory = memo(function MegaMenuCategory(
    {
      category,
      categoryIndex,
      onItemClick,
      activeRoute,
      isCompact = false,
    }: MegaMenuCategoryProps
  ) {
    const titleId = `category-title-${categoryIndex}`;
    const handleItemClick = useCallback(
      (item: MegaMenuItemType) => {
        onItemClick(item, category);
      },
      [onItemClick, category]
    );

    return (
      <div className="flex flex-col" role="group" aria-labelledby={titleId}>
        {/* عنوان القسم - نص فقط */}
        <h3
          id={titleId}
          className={cn(
            "font-bold text-foreground leading-none tracking-tight",
            isCompact ? "text-sm mb-2.5" : "text-base mb-3"
          )}
        >
          {repairMojibake(category.title)}
        </h3>

        {/* المسارات - أسماء فقط */}
        <ul className={cn("flex flex-col", isCompact ? "gap-0.5" : "gap-1")}>
          {category.items.map((item, index) => (
            <MegaMenuItem
              key={item.href || index}
              item={item}
              isActive={activeRoute ? activeRoute(item.href) : false}
              onClick={() => handleItemClick(item)}
              isCompact={isCompact}
            />
          ))}
        </ul>
      </div>
    );
  });

MegaMenuCategory.displayName = "MegaMenuCategory";
