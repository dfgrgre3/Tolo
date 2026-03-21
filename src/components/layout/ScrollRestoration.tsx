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
				const storedValue = safeGetItem(storageKey, { storageType: 'session', fallback: null });
				if (!storedValue) {
					return;
				}

				const position = typeof storedValue === 'string' ? JSON.parse(storedValue) : storedValue;
				const { x, y } = position as ScrollPosition;
				// Use double rAF to ensure the DOM is ready before scrolling
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						safeWindow((w) => w.scrollTo(x, y), undefined);
					});
				});
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
			const value: ScrollPosition = safeWindow((w) => ({
				x: w.scrollX,
				y: w.scrollY
			}), { x: 0, y: 0 });
			// Use safe wrapper that handles errors automatically
			safeSetItem(storageKey, value, { storageType: 'session' });
		};

		// Keep browser from overriding our manual logic
		const originalScrollRestoration = safeWindow((w) => w.history.scrollRestoration, 'auto');
		safeWindow((w) => {
			w.history.scrollRestoration = "manual";
		}, undefined);

		const handleVisibilityChange = () => {
			if (safeDocument((d) => d.visibilityState, 'visible') === "hidden") {
				storeScrollPosition();
			}
		};

		safeWindow((w) => {
			w.addEventListener("beforeunload", storeScrollPosition);
		}, undefined);
		safeDocument((d) => {
			d.addEventListener("visibilitychange", handleVisibilityChange);
		}, undefined);

		return () => {
			storeScrollPosition();
			safeWindow((w) => {
				w.removeEventListener("beforeunload", storeScrollPosition);
			}, undefined);
			safeDocument((d) => {
				d.removeEventListener("visibilitychange", handleVisibilityChange);
			}, undefined);
			safeWindow((w) => {
				w.history.scrollRestoration = originalScrollRestoration;
			}, undefined);
		};
	}, [storageKey]);

	return null;
};

export default ScrollRestoration;
