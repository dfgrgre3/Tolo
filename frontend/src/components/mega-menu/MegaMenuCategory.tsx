"use client";

import React, { forwardRef, memo } from "react";
import {
  Sparkles,
  Zap,
  ChevronLeft,
  BookOpen,
  Award,
  Clock,
  Target,
  Library,
  Lightbulb,
  BarChart3,
  Trophy,
  Users,
  GraduationCap,
  CreditCard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MegaMenuCategory as MegaMenuCategoryType } from "./types";
import { MegaMenuItem } from "./MegaMenuItem";
import { categoryStyles } from "@/components/navigation";

const categoryIconMap: Record<string, typeof Sparkles> = {
  "الدراسة والتعليم": BookOpen,
  "التقييمات والامتحانات": Award,
  "تنظيم الوقت": Clock,
  "التخطيط والأهداف": Target,
  "المكتبة الرقمية": Library,
  "المستندات والملخصات": Library,
  "المحتوى التعليمي": Library,
  "المحتوى التثقيفي": Lightbulb,
  "لوحة التحكم والأداء": BarChart3,
  "التنافس والترتيب": Trophy,
  "التواصل والمشاركة": Users,
  "المرحلة الابتدائية": GraduationCap,
  "المرحلة الإعدادية": GraduationCap,
  "المرحلة الثانوية": GraduationCap,
  "الحساب والاشتراك": CreditCard,
  "الإعدادات والأمان": Settings,
};

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
    const isCardFocused = focusedItemIndex !== undefined && focusedItemIndex >= 0;
    const hasActiveSearch = Boolean(searchQuery?.trim());
    const itemCount = category.items.length;
    const CategoryIcon = categoryIconMap[category.title] || Sparkles;

    return (
      <div
        ref={ref}
        className={cn(
          categoryStyles.card({ active: category.isPriority || isCardFocused, compact: isCompact }),
          "relative overflow-hidden group/category transition-all duration-300",
          "hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30 dark:hover:shadow-primary/[0.02]",
          isCardFocused && "border-primary/50 shadow-lg shadow-primary/15 ring-1 ring-primary/25 scale-[1.015] -translate-y-0.5"
        )}
        role="group"
        aria-labelledby={`category-title-${categoryIndex}`}
      >
        <div className={cn(categoryStyles.header({ compact: isCompact }))}>
          <div className={cn(
            "absolute bottom-0 start-0 h-px bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full transition-all duration-300",
            isCardFocused ? "w-full" : "w-0 group-hover/category:w-full"
          )} />
          <div
            className={cn(
              categoryStyles.iconWrap({ compact: isCompact }),
              "transition-all duration-300",
              isCardFocused 
                ? "scale-110 rotate-3 bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.3)]" 
                : "group-hover/category:scale-110 group-hover/category:rotate-3 group-hover/category:bg-primary group-hover/category:text-primary-foreground group-hover/category:shadow-[0_0_12px_rgba(var(--primary),0.3)]"
            )}
          >
            {hasActiveSearch ? (
              <Zap className={cn("h-3.5 w-3.5 text-primary group-hover/category:text-primary-foreground", isCompact && "h-3 w-3")} />
            ) : (
              <CategoryIcon className={cn("h-3.5 w-3.5 text-primary group-hover/category:text-primary-foreground transition-colors duration-300", isCompact && "h-3 w-3")} />
            )}
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

