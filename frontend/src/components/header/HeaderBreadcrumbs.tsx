"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href: string;
}

const routeLabels: Record<string, string> = {
  "/": "الرئيسية",
  "/courses": "الدورات",
  "/schedule": "الجدول الزمني",
  "/analytics": "التحليلات",
  "/forum": "المنتدى",
  "/blog": "المدونة",
  "/library": "المكتبة",
  "/time": "التتبع الزمني",
  "/settings": "الاعدادات",
  "/notifications": "الإشعارات",
  "/help": "المساعدة",
};

export function HeaderBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    if (!pathname) return [];

    const paths = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: "الرئيسية", href: "/" }];

    let currentPath = "";
    paths.forEach((path) => {
      currentPath += `/${path}`;
      const label =
        routeLabels[currentPath] ||
        path
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

      items.push({
        label,
        href: currentPath,
      });
    });

    return items;
  }, [pathname]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground px-4 py-2 border-b border-border/50 bg-background/50"
    >
      <ol className="flex items-center gap-1.5">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {index === 0 ? (
                <Link
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                    "hover:text-foreground hover:bg-accent/50",
                    isLast && "text-foreground font-medium"
                  )}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              ) : (
                <>
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50" />
                  {isLast ? (
                    <span className="px-2 py-1 text-foreground font-medium">{item.label}</span>
                  ) : (
                    <Link
                      href={item.href}
                      prefetch={true}
                      className="px-2 py-1 rounded-md transition-colors hover:text-foreground hover:bg-accent/50"
                    >
                      {item.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
