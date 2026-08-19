"use client";

import React, { forwardRef, memo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { MegaMenuCategory as MegaMenuCategoryType, NavItem as MegaMenuItemType } from "./types";
import { MegaMenuItem } from "./MegaMenuItem";
import { logger } from "@/lib/logger";

// ==========================================
// Tracking Utility
// ==========================================

function trackCategoryEvent(
  eventType: "impression",
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
  onItemClick: (item: MegaMenuItemType, category: MegaMenuCategoryType) => void;
  activeRoute?: (href: string) => boolean;
  isCompact?: boolean;
  focusedItemIndex?: number;
  enableTracking?: boolean;
}

// ==========================================
// Component - نصوص فقط: عنوان القسم + المسارات
// ==========================================

export const MegaMenuCategory = memo(
  forwardRef<HTMLDivElement, MegaMenuCategoryProps>(function MegaMenuCategory(
    {
      category,
      categoryIndex,
      onItemClick,
      activeRoute,
      isCompact = false,
      focusedItemIndex = -1,
      enableTracking = true,
    },
    ref
  ) {
    const itemCount = category.items.length;
    const titleId = `category-title-${categoryIndex}`;
    const hasTrackedImpressionRef = useRef(false);

    // تتبع الظهور مرة واحدة
    useEffect(() => {
      if (enableTracking && !hasTrackedImpressionRef.current && itemCount > 0 && category.id) {
        trackCategoryEvent("impression", category.id, category.title, {
          itemCount,
          isPriority: category.isPriority,
        });
        hasTrackedImpressionRef.current = true;
      }
    }, [enableTracking, category.id, category.title, itemCount, category.isPriority]);

    const handleItemClick = useCallback(
      (item: MegaMenuItemType) => {
        onItemClick(item, category);
      },
      [onItemClick, category]
    );

    return (
      <div ref={ref} className="flex flex-col" role="group" aria-labelledby={titleId}>
        {/* عنوان القسم - نص فقط */}
        <h3
          id={titleId}
          className={cn(
            "font-bold text-foreground leading-none tracking-tight",
            isCompact ? "text-sm mb-2.5" : "text-base mb-3"
          )}
        >
          {category.title}
        </h3>

        {/* المسارات - أسماء فقط */}
        <div className={cn("flex flex-col", isCompact ? "gap-0.5" : "gap-1")} role="list">
          {category.items.map((item, index) => (
            <MegaMenuItem
              key={item.href || index}
              item={item}
              isActive={activeRoute ? activeRoute(item.href) : false}
              onClick={() => handleItemClick(item)}
              isCompact={isCompact}
              isFocused={focusedItemIndex === index}
            />
          ))}
        </div>
      </div>
    );
  })
);

MegaMenuCategory.displayName = "MegaMenuCategory";
