"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { safeGetItem, safeSetItem, isBrowser, safeWindow, safeDocument } from "@/lib/safe-client-utils";

import { logger } from '@/lib/logger';

type ScrollPosition = {
	x: number;
	y: number;
};

const STORAGE_PREFIX = "scroll-position:";

const executeScroll = (x: number, y: number) => {
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			safeWindow((w) => w.scrollTo(x, y), undefined);
		});
	});
};

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
				logger.warn("Failed to serialize search params for scroll restoration:", error);
			}
		}

		return paramsString
			? `${STORAGE_PREFIX}${pathname}?${paramsString}`
			: `${STORAGE_PREFIX}${pathname}`;
	}, [pathname, searchParams]);

	useEffect(() => {
		if (!isBrowser()) {
			return;
		}

		const restoreScrollPosition = () => {
			try {
				const storedValue = safeGetItem(storageKey, { storageType: 'session', fallback: null }) as ScrollPosition | null;
				if (!storedValue) {
					return;
				}

				const { x, y } = storedValue;
				// Use double rAF to ensure the DOM is ready before scrolling
				executeScroll(x, y);
			} catch {
				// Ignore malformed values
			}
		};

		restoreScrollPosition();
	}, [storageKey]);

	useEffect(() => {
		if (!isBrowser()) {
			return;
		}

		const storeScrollPosition = () => {
			const scrollX = typeof window !== 'undefined' ? window.scrollX : 0;
			const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
			const value: ScrollPosition = { x: scrollX, y: scrollY };
			// Use safe wrapper that handles errors automatically
			safeSetItem(storageKey, value, { storageType: 'session' });
		};

		// Keep browser from overriding our manual logic
		const originalScrollRestoration = typeof window !== 'undefined' ? window.history.scrollRestoration : 'auto';
		if (typeof window !== 'undefined') {
			window.history.scrollRestoration = "manual";
		}

		if (typeof document !== 'undefined') {
			const handleVisibilityChange = () => {
				if (document.visibilityState === "hidden") {
					storeScrollPosition();
				}
			};

			if (typeof window !== 'undefined') {
				window.addEventListener("beforeunload", storeScrollPosition);
			}
			document.addEventListener("visibilitychange", handleVisibilityChange);

			return () => {
				storeScrollPosition();
				if (typeof window !== 'undefined') {
					window.removeEventListener("beforeunload", storeScrollPosition);
				}
				document.removeEventListener("visibilitychange", handleVisibilityChange);
				if (typeof window !== 'undefined') {
					window.history.scrollRestoration = originalScrollRestoration as ScrollRestoration;
				}
			};
		}
	}, [storageKey]);

	return null;
};

export default ScrollRestoration;
