"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { navigationApi, type BackendNavCategory, type BackendNavMenuEntry } from "@/lib/api/navigation-api";
import type { MegaMenuCategory } from "./types";
import { logger } from "@/lib/logger";
import { getNavigationIcon } from "./navigationIconMapper";
import { queryProfiles } from "@/lib/query/query-profiles";
import {
  headerNavItems,
  mainNavItemsWithMegaMenu,
  type NavItemWithMegaMenu,
} from "./navData";

// Navigation is public, rarely-changing catalog content: it belongs in the
// `static` freshness profile so it is cached, persisted to IndexedDB, and
// shared between every consumer instead of refetched per mount.
const NAVIGATION_QUERY_KEY = ["navigation", "menu"] as const;

// Transformed static fallback. Rendered on the first paint (before the query
// resolves) and whenever the backend is unreachable, so the header is never
// empty and never visibly flips between two menu structures.
const STATIC_FALLBACK_NAV_ITEMS: NavItemWithMegaMenu[] = [
  ...mainNavItemsWithMegaMenu,
  ...headerNavItems,
];
const STATIC_FALLBACK_CATEGORIES: MegaMenuCategory[] = STATIC_FALLBACK_NAV_ITEMS.flatMap(
  (item) => item.megaMenu ?? []
);

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

/**
 * Navigation menu data source.
 *
 * Fetches GET /api/v1/navigation/menu through TanStack Query so the response
 * is cached, deduplicated across consumers, and persisted between visits
 * (the project's caching layer — see providers/react-query-persistence.tsx).
 * While the request is in flight the hook returns the static fallback mirror
 * from navData.ts, so the header renders the full menu on the first paint
 * instead of an empty bar that pops in late.
 */
export function useNavigationMenu() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: NAVIGATION_QUERY_KEY,
    queryFn: () => navigationApi.getMenu(),
    ...queryProfiles.static,
  });

  const categories = useMemo<MegaMenuCategory[]>(() => {
    if (!data) return STATIC_FALLBACK_CATEGORIES;
    return (Array.isArray(data.categories) ? data.categories : []).map(transformBackendCategory);
  }, [data]);

  const navItems = useMemo<NavItemWithMegaMenu[]>(() => {
    if (!data) return STATIC_FALLBACK_NAV_ITEMS;

    return [...getMenuEntries(data, categories)]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((entry) => transformBackendMenu(entry, categories));
  }, [data, categories]);

  // Navigation is shared public content. Keep the header usable during a
  // backend restart, cold start, or short network outage instead of
  // rendering an empty navigation bar — the memos above already fall back to
  // the static mirror when `data` is absent.
  useEffect(() => {
    if (error) logger.warn("Navigation backend unavailable; using static fallback:", error);
  }, [error]);

  return {
    categories,
    navItems,
    loading: isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}
