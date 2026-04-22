"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Hook مشترك لإدارة حالة Mega Menu في Header
 * يضمن إغلاق القوائم عند تغيير المسار أو النقر خارج القائمة
 */
export function useMegaMenuState() {
	const pathname = usePathname();
	const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
	const [mounted, setMounted] = useState(false);

	// Handle mount to prevent hydration mismatch
	useEffect(() => {
		requestAnimationFrame(() => {
			setMounted(true);
		});
	}, []);

	// إغلاق القائمة عند تغيير المسار
	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			setOpenMegaMenu(null);
		});
		return () => cancelAnimationFrame(frame);
	}, [pathname]);

	// إغلاق القائمة عند النقر خارجها
	useEffect(() => {
		if (!mounted || !openMegaMenu) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				!target?.closest?.("[data-mega-menu-trigger]") &&
				!target?.closest?.("[data-mega-menu-content]")
			) {
				setOpenMegaMenu(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [openMegaMenu, mounted]);

	// إغلاق القائمة عند الضغط على ESC
	useEffect(() => {
		if (!mounted || !openMegaMenu) return;

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpenMegaMenu(null);
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [openMegaMenu, mounted]);

	const toggleMegaMenu = useCallback((menuKey: string | null) => {
		setOpenMegaMenu((current) => (current === menuKey ? null : menuKey));
	}, []);

	const closeMegaMenu = useCallback(() => {
		setOpenMegaMenu(null);
	}, []);

	const openMegaMenuKey = useCallback((menuKey: string) => {
		setOpenMegaMenu(menuKey);
	}, []);

	return {
		openMegaMenu,
		setOpenMegaMenu,
		toggleMegaMenu,
		closeMegaMenu,
		openMegaMenuKey,
		mounted,
	};
}

