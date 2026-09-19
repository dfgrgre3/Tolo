"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { MegaMenuCategory } from "./MegaMenuCategory";
import type { MegaMenuCategory as CategoryType } from "./types";

interface MegaMenuGridProps {
  categories: CategoryType[];
  activeRoute?: (href: string) => boolean;
  onItemClick: (item: import("./types").NavItem, category: CategoryType) => void;
}

/**
 * Groups categories into the columns the mega menu renders side by side.
 *
 * The backend assigns every category a `columnKey` (e.g. "study", "planning",
 * "account") precisely so related sections share a column; grouping on it
 * keeps the number of columns bounded by the information architecture rather
 * than by the raw category count. Categories without a `columnKey` each own a
 * column, and input order is preserved so the menu reads top-to-bottom,
 * right-to-left exactly as authored.
 *
 * One special case: when every category collapses onto a single column (the
 * schools menu, whose three stages all share `columnKey: "schools"`), the
 * full-width dropdown would show one narrow strip. Each stage gets its own
 * column instead, so siblings sit side by side.
 */
export function groupMegaMenuCategories(categories: CategoryType[]): CategoryType[][] {
  if (categories.length === 0) return [];

  const columns: CategoryType[][] = [];
  const columnIndexByKey = new Map<string, number>();

  for (const category of categories) {
    const key = category.columnKey;
    if (!key) {
      columns.push([category]);
      continue;
    }
    const existing = columnIndexByKey.get(key);
    if (existing === undefined) {
      columnIndexByKey.set(key, columns.length);
      columns.push([category]);
    } else {
      columns[existing]!.push(category);
    }
  }

  if (columns.length === 1 && columns[0]!.length > 1) {
    return categories.map((category) => [category]);
  }

  return columns;
}

export const MegaMenuGrid = React.memo(function MegaMenuGrid({
  categories,
  activeRoute,
  onItemClick
}: MegaMenuGridProps) {
  const columns = useMemo(() => groupMegaMenuCategories(categories), [categories]);

  // Dense menus (many side-by-side columns) use compact spacing so each
  // column stays readable without overflowing the full-width dropdown.
  const isCompact = columns.length > 4;

  return (
    <div
      className={cn(
        // Each group owns one column so headings and their link groups
        // stay visually independent and predictable.
        "flex w-full flex-nowrap items-start",
        isCompact ? "gap-x-4" : "gap-x-8"
      )}
    >
      {columns.map((column, columnIndex) => (
        <div
          className="flex min-w-0 flex-1 flex-col gap-5 max-w-[320px]"
          key={`mega-column-${columnIndex}`}
        >
          {column.map((category, categoryIndex) => (
            <MegaMenuCategory
              key={category.slug || category.id || `${category.title}-${categoryIndex}`}
              category={category}
              categoryIndex={categoryIndex}
              onItemClick={onItemClick}
              activeRoute={activeRoute}
              isCompact={isCompact}
            />
          ))}
        </div>
      ))}
    </div>
  );
});
