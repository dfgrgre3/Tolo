"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

export function useMegaMenuState() {
  const pathname = usePathname();
  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpenMegaMenu(null));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!mounted || !openMegaMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target?.closest?.("[data-mega-menu-trigger]") && !target?.closest?.("[data-mega-menu-content]")) {
        setOpenMegaMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMegaMenu(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMegaMenu, mounted]);

  const toggleMegaMenu = useCallback((menuKey: string | null) => {
    setOpenMegaMenu((current) => (current === menuKey ? null : menuKey));
  }, []);

  const closeMegaMenu = useCallback(() => setOpenMegaMenu(null), []);
  const openMegaMenuKey = useCallback((menuKey: string) => setOpenMegaMenu(menuKey), []);

  return { openMegaMenu, setOpenMegaMenu, toggleMegaMenu, closeMegaMenu, openMegaMenuKey, mounted };
}
