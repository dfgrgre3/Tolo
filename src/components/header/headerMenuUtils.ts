import { Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NavItemWithMegaMenu } from "@/components/mega-menu/navData";

export interface MobileSearchResult {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  section?: string;
}

export function buildMobileNavItems(navItems: NavItemWithMegaMenu[]) {
  return navItems.filter((item) => item.href !== "/");
}

export function buildMobileSearchResults(navItems: NavItemWithMegaMenu[]) {
  const items: MobileSearchResult[] = [];
  const seen = new Set<string>();

  const addItem = (entry: MobileSearchResult) => {
    const key = `${entry.href}::${entry.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(entry);
  };

  addItem({ href: "/", label: "الرئيسية", icon: Home });

  navItems.forEach((item) => {
    addItem({
      href: item.href,
      label: item.label,
      icon: item.icon,
      badge: item.badge,
      section: item.label,
    });

    (item.megaMenu || []).forEach((category) => {
      category.items.forEach((subItem) => {
        addItem({
          href: subItem.href,
          label: subItem.label,
          icon: subItem.icon,
          badge: subItem.badge,
          section: item.label,
        });
      });
    });
  });

  return items;
}

export function buildMobileSearchResultsWithExtras(
  navItems: NavItemWithMegaMenu[],
  extras: Array<{ label: string; categories: NavItemWithMegaMenu["megaMenu"] }> = []
) {
  const base = buildMobileSearchResults(navItems);
  const seen = new Set(base.map((item) => `${item.href}::${item.label}`));

  extras.forEach((extra) => {
    extra.categories?.forEach((category) => {
      category.items.forEach((subItem) => {
        const entry: MobileSearchResult = {
          href: subItem.href,
          label: subItem.label,
          icon: subItem.icon,
          badge: subItem.badge,
          section: extra.label,
        };
        const key = `${entry.href}::${entry.label}`;
        if (seen.has(key)) return;
        seen.add(key);
        base.push(entry);
      });
    });
  });

  return base;
}
