"use client";

import { useState, useEffect, useCallback } from "react";
import { navigationApi, type BackendNavCategory, type BackendNavMenuEntry } from "@/lib/api/navigation-api";
import type { MegaMenuCategory } from "./types";
import { logger } from "@/lib/logger";
import { getNavigationIcon } from "./navigationIconMapper";
import {
  headerNavItems,
  mainNavItemsWithMegaMenu,
  type NavItemWithMegaMenu,
} from "./navData";

// Transform backend nav category to MegaMenuCategory
function transformBackendCategory(cat: BackendNavCategory): MegaMenuCategory {
  return {
    id: cat.id,
    title: cat.title,
    slug: cat.slug,
    menuKey: cat.menuKey,
    columnKey: cat.columnKey,
    items: Array.isArray(cat.items)
      ? cat.items.map((item) => ({
          href: item.href,
          label: item.label,
          icon: getNavigationIcon(item.icon),
          description: item.description,
          badge: item.badge,
        }))
      : [],
    isPriority: cat.isPriority,
    priorityLabel: cat.priorityLabel,
  };
}

function transformBackendMenu(entry: BackendNavMenuEntry, categories: MegaMenuCategory[]): NavItemWithMegaMenu {
  return {
    href: entry.href,
    label: entry.label,
    description: entry.description,
    badge: entry.badge,
    icon: getNavigationIcon(entry.icon),
    megaMenu: categories.filter((category) => category.menuKey === entry.key),
  };
}

function getMenuEntries(menu: Awaited<ReturnType<typeof navigationApi.getMenu>>, categories: MegaMenuCategory[]) {
  if (menu.menus.length > 0) return menu.menus;

  // Compatibility with an older backend response: the grouping key and
  // category title still come from the API; no frontend navigation data is added.
  const groups = new Map<string, MegaMenuCategory>();
  for (const category of categories) {
    if (category.menuKey && !groups.has(category.menuKey)) {
      groups.set(category.menuKey, category);
    }
  }

  return [...groups.entries()].map(([key, category], index) => ({
    key,
    href: `/${key}`,
    label: category.title,
    icon: undefined,
    order: index,
  }));
}

export function useNavigationMenu() {
  const [categories, setCategories] = useState<MegaMenuCategory[]>([]);
  const [navItems, setNavItems] = useState<NavItemWithMegaMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNavigation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const menu = await navigationApi.getMenu();
      const categories = Array.isArray(menu?.categories) ? menu.categories : [];
      const transformedCategories = categories.map(transformBackendCategory);
      setCategories(transformedCategories);
      setNavItems(
        [...getMenuEntries(menu, transformedCategories)]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((entry) => transformBackendMenu(entry, transformedCategories))
      );
    } catch (err) {
      // Navigation is shared public content. Keep the header usable during a
      // backend restart, cold start, or short network outage instead of
      // rendering an empty navigation bar.
      logger.warn('Navigation backend unavailable; using static fallback:', err);
      setCategories([
        ...mainNavItemsWithMegaMenu.flatMap((item) => item.megaMenu ?? []),
        ...headerNavItems.flatMap((item) => item.megaMenu ?? []),
      ]);
      setNavItems([...mainNavItemsWithMegaMenu, ...headerNavItems]);
      setError(err instanceof Error ? err : new Error('Failed to fetch navigation'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchNavigation();
    });
  }, [fetchNavigation]);

  return {
    categories,
    navItems,
    loading,
    error,
    refetch: fetchNavigation,
  };
}
