"use client";

import React, { forwardRef, memo } from "react";
import { Sparkles, Zap, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MegaMenuCategory as MegaMenuCategoryType } from "./types";
import { MegaMenuItem } from "./MegaMenuItem";
import { categoryStyles } from "@/components/navigation";

interface MegaMenuCategoryProps {
  category: MegaMenuCategoryType;
  categoryIndex: number;
  onItemClick: () => void;
  activeRoute?: (href: string) => boolean;
  isCompact?: boolean;
  searchQuery?: string;
  focusedItemIndex?: number;
}

export const MegaMenuCategory = memo(
  forwardRef<HTMLDivElement, MegaMenuCategoryProps>(function MegaMenuCategory(
    { category, categoryIndex, onItemClick, activeRoute, isCompact = false, searchQuery = "", focusedItemIndex = -1 },
    ref
  ) {
    const hasActiveSearch = Boolean(searchQuery?.trim());
    const itemCount = category.items.length;

    return (
      <div
        ref={ref}
        className={cn(categoryStyles.card({ active: category.isPriority, compact: isCompact }), "relative overflow-hidden group/category")}
        role="group"
        aria-labelledby={`category-title-${categoryIndex}`}
      >
        <div className={cn(categoryStyles.header({ compact: isCompact }))}>
          <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full group-hover/category:w-full transition-all duration-200" />
          <div
            className={cn(categoryStyles.iconWrap({ compact: isCompact }), "transition-colors duration-200")}
          >
            {hasActiveSearch ? <Zap className={cn("h-3.5 w-3.5 text-primary", isCompact && "h-3 w-3")} /> : <Sparkles className={cn("h-3.5 w-3.5 text-primary", isCompact && "h-3 w-3")} />}
          </div>

          <div className="flex-1 flex items-center justify-between">
            <div className="flex flex-col">
              <h3 id={`category-title-${categoryIndex}`} className={cn(categoryStyles.title({ compact: isCompact }), "transition-colors duration-200")}>
                {category.title}
              </h3>
              {category.priorityLabel && !isCompact && <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{category.priorityLabel}</span>}
            </div>

            <span
              className={cn(
                categoryStyles.count({ state: category.isPriority ? "priority" : hasActiveSearch ? "search" : "neutral" })
              )}
            >
              {itemCount}
            </span>
          </div>

          <div className="text-muted-foreground/50 group-hover/category:text-primary/50 transition-colors duration-200">
            <ChevronLeft className={cn("h-4 w-4", isCompact && "h-3.5 w-3.5")} />
          </div>
        </div>

        <div className={cn("space-y-2 relative z-10", isCompact && "space-y-1.5")} role="list">
          {category.items.map((item, itemIndex) => (
            <MegaMenuItem
              key={`${item.href}-${itemIndex}`}
              item={item}
              isActive={activeRoute ? activeRoute(item.href) : false}
              onClick={onItemClick}
              delay={0}
              isCompact={isCompact}
              searchQuery={searchQuery}
              isFocused={focusedItemIndex === itemIndex}
            />
          ))}
        </div>

        {itemCount > 4 && !isCompact && (
          <div className="pt-2 relative z-10">
            <button onClick={onItemClick} className="text-xs text-primary/70 hover:text-primary font-medium flex items-center gap-1 transition-colors duration-200">
              <span>عرض الكل</span>
              <ChevronLeft className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  })
);

MegaMenuCategory.displayName = "MegaMenuCategory";

