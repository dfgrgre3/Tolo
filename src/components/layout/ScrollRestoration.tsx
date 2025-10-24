"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ScrollPosition = {
	x: number;
	y: number;
};

const STORAGE_PREFIX = "scroll-position:";

const ScrollRestoration = () => {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const storageKey = useMemo(() => {
		let paramsString = "";

		if (searchParams) {
			try {
				paramsString = searchParams.toString();
			} catch (error) {
				// Avoid breaking rendering if serialization fails
				console.warn("Failed to serialize search params for scroll restoration:", error);
			}
		}

		return paramsString
			? `${STORAGE_PREFIX}${pathname}?${paramsString}`
			: `${STORAGE_PREFIX}${pathname}`;
	}, [pathname, searchParams]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const restoreScrollPosition = () => {
			try {
				const storedValue = sessionStorage.getItem(storageKey);
				if (!storedValue) {
					return;
				}

				const { x, y } = JSON.parse(storedValue) as ScrollPosition;
				// Use double rAF to ensure the DOM is ready before scrolling
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						window.scrollTo(x, y);
					});
				});
			} catch {
				// Ignore malformed values
			}
		};

		restoreScrollPosition();
	}, [storageKey]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const storeScrollPosition = () => {
			try {
				const value: ScrollPosition = {
					x: window.scrollX,
					y: window.scrollY
				};
				sessionStorage.setItem(storageKey, JSON.stringify(value));
			} catch {
				// Ignore storage errors
			}
		};

		// Keep browser from overriding our manual logic
		const originalScrollRestoration = window.history.scrollRestoration;
		window.history.scrollRestoration = "manual";

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				storeScrollPosition();
			}
		};

		window.addEventListener("beforeunload", storeScrollPosition);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			storeScrollPosition();
			window.removeEventListener("beforeunload", storeScrollPosition);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.history.scrollRestoration = originalScrollRestoration;
		};
	}, [storageKey]);

	return null;
};

export default ScrollRestoration;
