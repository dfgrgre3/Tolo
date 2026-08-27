"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/contexts/auth-context";

const buildLoginUrl = (redirect?: string) => {
  return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
};

const HEADER_PREFERENCES = {
  compactMode: false,
  showProgress: true,
  showSuggestions: true,
} as const;

export const useLoginUrl = () => {
  const pathname = usePathname();
  const [loginUrl, setLoginUrl] = useState("/login");

  useEffect(() => {
    const query =
      typeof window !== "undefined"
        ? window.location.search.replace(/^\?/, "")
        : "";
    const fullPath = `${pathname || "/"}${query ? `?${query}` : ""}`;
    queueMicrotask(() => setLoginUrl(buildLoginUrl(fullPath)));
  }, [pathname]);

  return loginUrl;
};

export const useHeaderClasses = (isScrolled: boolean, mounted: boolean, user: AuthUser | null, isHidden = false) => {
  return useMemo(() => {
    return cn(
      "sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
      isHidden ? "-translate-y-full" : "translate-y-0",
      isScrolled ? "shadow-lg shadow-black/5 border-primary/25 bg-background/90" : "border-border/40",
      mounted && user && !isScrolled && "border-primary/15"
    );
  }, [isScrolled, mounted, user, isHidden]);
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