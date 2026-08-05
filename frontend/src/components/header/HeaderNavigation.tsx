"use client";

import React, { useState, useMemo } from "react";
import { MegaMenu } from "@/components/mega-menu";
import { useNavigationMenu } from "@/components/mega-menu";
import { mainNavItemsWithMegaMenu, moreMegaMenu, coursesMegaMenu, libraryMegaMenu, competitionMegaMenu } from "@/components/mega-menu/navData";
import { cn } from "@/lib/utils";
import { User } from "@/types/user";
import { HeaderNavLink } from "@/components/navigation";
import {
  Home,
  BookOpen,
  Library,
  Brain,
  Gamepad2,
  Sparkles,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

interface MainNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
  megaMenuKey?: string;
}

const mainNavItems: MainNavItem[] = [
  { href: "/", label: "الرئيسية", icon: Home, description: "العودة إلى الصفحة الرئيسية" },
  { href: "/courses", label: "الدورات", icon: BookOpen, description: "استكشف الدورات التعليمية", badge: "جديد", megaMenuKey: "courses" },
  { href: "/library", label: "المكتبة", icon: Library, description: "مصادر تعليمية متنوعة", megaMenuKey: "library" },
  { href: "/ai", label: "الذكاء الاصطناعي", icon: Brain, description: "تعلم أذكى مع AI", badge: "AI" },
  { href: "/leaderboard", label: "التحديات", icon: Gamepad2, description: "لوحة الترتيب والمنافسات", megaMenuKey: "competition" },
  { href: "/settings", label: "المزيد", icon: Sparkles, description: "المزيد من الخيارات والأدوات", megaMenuKey: "more" },
];

interface HeaderNavigationProps {
  openMegaMenu: string | null;
  setOpenMegaMenu: React.Dispatch<React.SetStateAction<string | null>>;
  isActiveRoute: (href: string) => boolean;
  mounted: boolean;
  user?: User | null;
}

export function HeaderNavigation({
  openMegaMenu,
  setOpenMegaMenu,
  isActiveRoute,
  mounted,
  user,
}: HeaderNavigationProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const { categories: navCategories, loading } = useNavigationMenu();

  // Fallback data from navData.tsx when API fails or returns empty
  const fallbackCategories = useMemo(() => {
    const allCategories = [
      ...coursesMegaMenu,
      ...libraryMegaMenu,
      ...competitionMegaMenu,
      ...moreMegaMenu,
    ];
    return allCategories;
  }, []);

  // Use API categories if available, otherwise fallback
  const effectiveCategories = useMemo(() => {
    return navCategories.length > 0 ? navCategories : fallbackCategories;
  }, [navCategories, fallbackCategories]);

  // Build a map of megaMenuKey to categories for easy lookup
  const megaMenuMap = useMemo(() => {
    const map: Record<string, typeof effectiveCategories> = {};
    // Group categories by their slug to match megaMenuKey
    effectiveCategories.forEach((cat) => {
      const slug = cat.slug;
      if (!slug) return;
      
      if (slug === "study" || slug === "exams" || slug === "time_management" || slug === "goals") {
        map.courses = map.courses || [];
        map.courses.push(cat);
      } else if (slug === "digital_library" || slug === "awareness" || slug === "dashboard") {
        map.library = map.library || [];
        map.library.push(cat);
      } else if (slug === "leaderboard" || slug === "community") {
        map.competition = map.competition || [];
        map.competition.push(cat);
      } else if (slug === "subscription" || slug === "settings") {
        map.more = map.more || [];
        map.more.push(cat);
      } else if (slug === "primary" || slug === "middle" || slug === "high_school") {
        // Schools - can be added to any category or separate
      }
    });
    return map;
  }, [effectiveCategories]);

  return (
    <nav
      className="hidden lg:flex items-center gap-2 flex-1 justify-center relative"
      aria-label="القائمة الرئيسية"
      onMouseLeave={() => setHoveredKey(null)}
    >
      {mainNavItems.map((item) => {
        const menuKey = item.href;
        const isOpen = openMegaMenu === menuKey;
        const isActive = mounted && isActiveRoute(item.href);
        const isHovered = hoveredKey === menuKey;
        const megaMenuCategories = item.megaMenuKey ? megaMenuMap[item.megaMenuKey] || [] : [];

        return (
          <div
            key={item.href}
            className="relative group/nav-item"
            onMouseEnter={() => setHoveredKey(menuKey)}
            data-mega-menu-wrapper={item.megaMenuKey ? "true" : undefined}
          >
            <div className="relative z-10">
              {item.megaMenuKey && megaMenuCategories.length > 0 ? (
                <MegaMenu
                  categories={megaMenuCategories}
                  isOpen={isOpen}
                  onClose={() => setOpenMegaMenu(null)}
                  onOpen={() => setOpenMegaMenu(menuKey)}
                  activeRoute={isActiveRoute}
                  label={item.label}
                  user={user}
                  zIndex={50}
                  className={cn(
                    "relative h-11 px-6 flex items-center gap-3 rounded-[1.25rem] font-black uppercase text-[11px] tracking-widest",
                    isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-gray-400 border border-transparent hover:text-primary",
                    isOpen && "bg-primary/20 text-primary border-primary/40"
                  )}
                />
              ) : (
                <HeaderNavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                  active={isActive}
                  variant="desktop"
                />
              )}
            </div>

            {item.badge && mounted && (
              <div className="absolute -top-1 -right-1 pointer-events-none z-20">
                <span className="relative h-4 px-2 bg-primary text-black text-[9px] font-black italic rounded-full flex items-center justify-center border border-black shadow-[0_0_10px_hsl(var(--primary)_/_0.5)]">
                  {item.badge}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}