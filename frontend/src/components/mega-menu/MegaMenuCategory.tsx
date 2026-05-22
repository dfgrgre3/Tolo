"use client";

import React, { forwardRef, memo } from "react";
import { m } from "framer-motion";
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
      <m.div
        ref={ref}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: categoryIndex * 0.03, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.01 }}
        className={cn(categoryStyles.card({ active: category.isPriority, compact: isCompact }))}
        role="group"
        aria-labelledby={`category-title-${categoryIndex}`}
      >
        <m.div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover/category:opacity-100 transition-opacity duration-500 blur-xl" initial={false} />

        <div className={cn(categoryStyles.header({ compact: isCompact }))}>
          <m.div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full" initial={{ width: 0 }} whileHover={{ width: "100%" }} transition={{ duration: 0.4, ease: "easeOut" }} />
          <m.div
            whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
            whileTap={{ scale: 0.95 }}
            className={cn(categoryStyles.iconWrap({ compact: isCompact }))}
          >
            {hasActiveSearch ? <Zap className={cn("h-3.5 w-3.5 text-primary", isCompact && "h-3 w-3")} /> : <Sparkles className={cn("h-3.5 w-3.5 text-primary", isCompact && "h-3 w-3")} />}
          </m.div>

          <div className="flex-1 flex items-center justify-between">
            <div className="flex flex-col">
              <h3 id={`category-title-${categoryIndex}`} className={cn(categoryStyles.title({ compact: isCompact }))}>
                {category.title}
              </h3>
              {category.priorityLabel && !isCompact && <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">{category.priorityLabel}</span>}
            </div>

            <m.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                categoryStyles.count({ state: category.isPriority ? "priority" : hasActiveSearch ? "search" : "neutral" })
              )}
            >
              {itemCount}
            </m.span>
          </div>

          <m.div className="text-muted-foreground/50 group-hover/category:text-primary/50 transition-colors" whileHover={{ x: -3 }}>
            <ChevronLeft className={cn("h-4 w-4", isCompact && "h-3.5 w-3.5")} />
          </m.div>
        </div>

        <div className={cn("space-y-2 relative z-10", isCompact && "space-y-1.5")} role="list">
          {category.items.map((item, itemIndex) => (
            <MegaMenuItem
              key={`${item.href}-${itemIndex}`}
              item={item}
              isActive={activeRoute ? activeRoute(item.href) : false}
              onClick={onItemClick}
              delay={categoryIndex * 0.03 + itemIndex * 0.02}
              isCompact={isCompact}
              searchQuery={searchQuery}
              isFocused={focusedItemIndex === itemIndex}
            />
          ))}
        </div>

        {itemCount > 4 && !isCompact && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="pt-2 relative z-10">
            <button onClick={onItemClick} className="text-xs text-primary/70 hover:text-primary font-medium flex items-center gap-1 transition-colors">
              <span>عرض الكل</span>
              <ChevronLeft className="h-3 w-3" />
            </button>
          </m.div>
        )}
      </m.div>
    );
  })
);

MegaMenuCategory.displayName = "MegaMenuCategory";
