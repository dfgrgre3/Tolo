"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const buildLoginUrl = (redirect?: string) => {
  return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
};

const HEADER_PREFERENCES = {
  compactMode: false,
  showProgress: true,
  showSuggestions: true,
  showActivity: true,
} as const;

export const useLoginUrl = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  return useMemo(() => {
    const query = searchParams.toString();
    const fullPath = `${pathname || '/'}${query ? `?${query}` : ''}`;
    return buildLoginUrl(fullPath);
  }, [pathname, searchParams]);
};

export const useHeaderClasses = (isScrolled: boolean, mounted: boolean, user: any) => {
  return useMemo(() => {
    return cn(
      "sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
      isScrolled ? "shadow-lg shadow-black/5 border-primary/25 bg-background/90" : "border-border/40",
      mounted && user && !isScrolled && "border-primary/15"
    );
  }, [isScrolled, mounted, user]);
};

export const useContainerHeight = (isShrunk: boolean) => {
  return useMemo(() => {
    if (HEADER_PREFERENCES.compactMode || isShrunk) return "h-10 sm:h-12";
    return "h-12 sm:h-14";
  }, [isShrunk]);
};

export const useHeaderWidgets = (isEfficiencyMode: boolean) => {
  return useMemo(() => ({
    progress: HEADER_PREFERENCES.showProgress && !isEfficiencyMode,
    suggestions: HEADER_PREFERENCES.showSuggestions && !isEfficiencyMode,
  }), [isEfficiencyMode]);
};

export { HEADER_PREFERENCES };