"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMounted } from "@/hooks/use-mounted";

export function useMegaMenuState() {
  const pathname = usePathname();
  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
  const mounted = useMounted();

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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMegaMenu, mounted]);

  const toggleMegaMenu = useCallback((menuKey: string | null) => {
    setOpenMegaMenu((current) => (current === menuKey ? null : menuKey));
  }, []);

  const closeMegaMenu = useCallback(() => setOpenMegaMenu(null), []);
  const openMegaMenuKey = useCallback((menuKey: string) => setOpenMegaMenu(menuKey), []);

  return { openMegaMenu, setOpenMegaMenu, toggleMegaMenu, closeMegaMenu, openMegaMenuKey, mounted };
}
