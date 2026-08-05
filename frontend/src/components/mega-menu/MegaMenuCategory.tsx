"use client";

import React, { forwardRef, memo, useCallback, useEffect, useRef } from "react";
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
import type { MegaMenuCategory as MegaMenuCategoryType, NavItem as MegaMenuItemType } from "./types";
import { MegaMenuItem } from "./MegaMenuItem";
import { categoryStyles } from "@/components/navigation";
import { logger } from "@/lib/logger";

// ==========================================
// Icon Map - مفاتيح بالـ ID/Slug وليس بالنص العربي
// ==========================================

const CATEGORY_ICON_MAP: Record<string, typeof Sparkles> = {
  study: BookOpen,
  exams: Award,
  time_management: Clock,
  goals: Target,
  digital_library: Library,
  documents: Library,
  educational_content: Library,
  awareness: Lightbulb,
  dashboard: BarChart3,
  leaderboard: Trophy,
  community: Users,
  primary: GraduationCap,
  middle: GraduationCap,
  high_school: GraduationCap,
  subscription: CreditCard,
  settings: Settings,
};

function getCategoryIcon(category: MegaMenuCategoryType): typeof Sparkles {
  // البحث بالـ slug أولاً ثم الـ id ثم الافتراضي
  const slug = category.slug;
  const id = category.id;
  return CATEGORY_ICON_MAP[slug ?? ''] 
    || CATEGORY_ICON_MAP[id ?? ''] 
    || Sparkles;
}

// ==========================================
// Tracking Utility
// ==========================================

function trackCategoryEvent(
  eventType: "impression" | "view_all",
  categoryId: string,
  categoryTitle: string,
  metadata?: Record<string, unknown>
) {
  const payload = JSON.stringify({
    type: eventType,
    component: "mega_menu_category",
    categoryId,
    categoryTitle,
    timestamp: Date.now(),
    ...metadata,
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/analytics/mega-menu", payload);
    if (!sent) fallbackTrack(payload);
  } else {
    fallbackTrack(payload);
  }
}

function fallbackTrack(payload: string) {
  fetch("/api/analytics/mega-menu", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch((e) => logger.debug("Category fallback track failed:", e));
}

// ==========================================
// Types
// ==========================================

interface MegaMenuCategoryProps {
  category: MegaMenuCategoryType;
  categoryIndex: number;
  /** توقيع واضح: يستقبل العنصر والفئة */
  onItemClick: (item: MegaMenuItemType, category: MegaMenuCategoryType) => void;
  /** دالة منفصلة لزر "عرض الكل" */
  onViewAll?: (category: MegaMenuCategoryType) => void;
  activeRoute?: (href: string) => boolean;
  isCompact?: boolean;
  searchQuery?: string;
  focusedItemIndex?: number;
  enableTracking?: boolean;
}

// ==========================================
// Component
// ==========================================

export const MegaMenuCategory = memo(
  forwardRef<HTMLDivElement, MegaMenuCategoryProps>(function MegaMenuCategory(
    {
      category,
      categoryIndex,
      onItemClick,
      onViewAll,
      activeRoute,
      isCompact = false,
      searchQuery = "",
      focusedItemIndex = -1,
      enableTracking = true,
    },
    ref
  ) {
    const hasActiveSearch = Boolean(searchQuery?.trim());
    const isCardFocused = focusedItemIndex >= 0;
    const itemCount = category.items.length;
    const CategoryIcon = getCategoryIcon(category);
    const titleId = `category-title-${categoryIndex}`;
    const hasTrackedImpressionRef = useRef(false);

    // تتبع الظهور مرة واحدة
    useEffect(() => {
      if (enableTracking && !hasTrackedImpressionRef.current && itemCount > 0 && category.id) {
        trackCategoryEvent("impression", category.id, category.title, {
          itemCount,
          isPriority: category.isPriority,
          hasSearch: hasActiveSearch,
        });
        hasTrackedImpressionRef.current = true;
      }
    }, [enableTracking, category.id, category.title, itemCount, category.isPriority, hasActiveSearch]);

    // Wrapper آمن للنقر على العنصر
    const handleItemClick = useCallback(
      (item: MegaMenuItemType) => {
        onItemClick(item, category);
      },
      [onItemClick, category]
    );

    // Wrapper آمن لزر "عرض الكل"
    const handleViewAll = useCallback(() => {
      if (enableTracking && category.id) {
        trackCategoryEvent("view_all", category.id, category.title);
      }
      onViewAll?.(category);
    }, [onViewAll, category, enableTracking]);

    return (
      <div
        ref={ref}
        className={cn(
          categoryStyles.card({ active: category.isPriority || isCardFocused, compact: isCompact }),
          "relative overflow-hidden group/category transition-shadow duration-200",
          "hover:shadow-lg hover:border-primary/30 dark:hover:shadow-primary/[0.02]",
          isCardFocused && "border-primary/50 shadow-lg shadow-primary/15 ring-1 ring-primary/25"
        )}
        role="group"
        aria-labelledby={titleId}
      >
        {/* رأس البطاقة */}
        <div className={cn(categoryStyles.header({ compact: isCompact }))}>
          {/* شريط التقدم السفلي */}
          <div
            className={cn(
              "absolute bottom-0 start-0 h-px bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full transition-all duration-300 ease-out",
              isCardFocused ? "w-full" : "w-0 group-hover/category:w-full"
            )}
            aria-hidden="true"
          />

          {/* حاوية الأيقونة */}
          <div
            className={cn(
              categoryStyles.iconWrap({ compact: isCompact }),
              "transition-colors duration-200",
              isCardFocused
                ? "bg-primary text-primary-foreground"
                : "group-hover/category:bg-primary group-hover/category:text-primary-foreground"
            )}
          >
            {hasActiveSearch ? (
              <Zap className={cn("text-current", isCompact ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden="true" />
            ) : (
              <CategoryIcon className={cn("text-current", isCompact ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden="true" />
            )}
          </div>

          {/* العنوان والعدد */}
          <div className="flex-1 flex items-center justify-between min-w-0">
            <div className="flex flex-col min-w-0">
              <h3 id={titleId} className={cn(categoryStyles.title({ compact: isCompact }))}>
                {category.title}
              </h3>
              {category.priorityLabel && !isCompact && (
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] truncate max-w-[120px]">
                  {category.priorityLabel}
                </span>
              )}
            </div>

            <span
              className={cn(
                categoryStyles.count({ state: category.isPriority ? "priority" : hasActiveSearch ? "search" : "neutral" })
              )}
            >
              {itemCount}
            </span>
          </div>

          {/* سهم الاتجاه */}
          <div className="text-muted-foreground/50 group-hover/category:text-primary/50 transition-colors duration-200 flex-shrink-0">
            <ChevronLeft className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden="true" />
          </div>
        </div>

        {/* قائمة العناصر - index يمرر مباشرة لتجنب indexOf */}
        <div className={cn("space-y-2 relative z-10", isCompact && "space-y-1.5")} role="list">
          {category.items.map((item, index) => (
            <MegaMenuItem
              key={item.href || index}
              item={item}
              isActive={activeRoute ? activeRoute(item.href) : false}
              onClick={() => handleItemClick(item)}
              delay={0}
              isCompact={isCompact}
              searchQuery={searchQuery}
              isFocused={focusedItemIndex === index}
            />
          ))}
        </div>

        {/* زر عرض الكل - دالة منفصلة */}
        {itemCount > 4 && !isCompact && onViewAll && (
          <div className="pt-2 relative z-10">
            <button
              onClick={handleViewAll}
              className="text-xs text-primary/70 hover:text-primary font-medium flex items-center gap-1 transition-colors duration-200 focus-visible:outline-none focus-visible:underline"
              aria-label={`عرض جميع عناصر فئة ${category.title}`}
            >
              <span>عرض الكل</span>
              <ChevronLeft className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  })
);

MegaMenuCategory.displayName = "MegaMenuCategory";