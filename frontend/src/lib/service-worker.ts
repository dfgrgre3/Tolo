"use client";

import { logger } from '@/lib/logger';

/**
 * Service Worker registration and management utilities
 */

const SW_PATH = "/sw.js";
const SW_SCOPE = "/";
const SW_CACHE_PREFIX = "tolo-search";

async function cleanupServiceWorkerArtifacts(): Promise<void> {
	try {
		const registrations = await navigator.serviceWorker.getRegistrations();
		await Promise.all(registrations.map((registration) => registration.unregister()));
	} catch (error) {
		logger.debug("Service Worker cleanup (unregister) skipped:", error);
	}

	if (!("caches" in window)) {
		return;
	}

	try {
		const cacheNames = await caches.keys();
		await Promise.all(
			cacheNames
				.filter((name) => name.startsWith(SW_CACHE_PREFIX) || name.includes("next") || name.includes("webpack") || name.includes("turbopack"))
				.map((name) => caches.delete(name))
		);
	} catch (error) {
		logger.debug("Service Worker cleanup (cache) skipped:", error);
	}
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
		logger.debug("Service Worker not supported");
		return null;
	}

	// Avoid stale dev assets/chunks by disabling and cleaning Service Workers outside production.
	if (process.env.NODE_ENV !== "production") {
		await cleanupServiceWorkerArtifacts();
		logger.debug("Service Worker disabled outside production");
		return null;
	}

	try {
		const registration = await navigator.serviceWorker.register(SW_PATH, {
			scope: SW_SCOPE,
		});

		logger.debug("Service Worker registered:", registration);

		// Check for updates
		registration.addEventListener("updatefound", () => {
			const newWorker = registration.installing;
			if (newWorker) {
				newWorker.addEventListener("statechange", () => {
					if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
						// New service worker available
						logger.debug("New Service Worker available");
					}
				});
			}
		});

		return registration;
	} catch (error) {
		logger.error("Service Worker registration failed:", error);
		return null;
	}
}

/**
 * Tells the active Service Worker to pre-warm `SEARCH_CACHE` for the
 * given query/scope so the next identical search can hit CacheStorage
 * instead of the network. The actual fetch + cache.put happens inside
 * the SW (see `PRE_CACHE_SEARCH` handler in `public/sw.js`) because
 * the SW's fetch handler treats `/api/*` as a passthrough.
 *
 * Returns `true` only when the SW acknowledged a successful cache write.
 * `false` means: no active SW controller, the SW timed out (2s), the
 * SW reported a non-2xx, or the helper threw. Pre-cache is best-effort
 * by design — callers should never block user flows on the result.
 */
export async function preCacheSearch(query: string, scope: string = "all"): Promise<boolean> {
	const response = await postMessageToServiceWorker("PRE_CACHE_SEARCH", { query, scope });
	return response?.success ?? false;
}

/**
 * Sends a typed message to the active Service Worker via MessageChannel
 * and resolves with the SW's response. Returns `null` if no controller
 * is available (first load before `clients.claim()`), allowing the
 * caller to fall back to direct CacheStorage operations.
 *
 * This is the SINGLE place that knows how to speak to the SW message
 * protocol. Every other helper in this module delegates here so that
 * if the SW message shape ever changes, only this function changes.
 */
async function postMessageToServiceWorker(
	type: string,
	payload: Record<string, unknown> = {},
	timeoutMs = 2000,
): Promise<{ success: boolean; error?: string } | null> {
	if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
		return null;
	}
	const controller = navigator.serviceWorker.controller;
	if (!controller) return null;

	return new Promise((resolve) => {
		const messageChannel = new MessageChannel();
		let settled = false;
		const settle = (value: { success: boolean; error?: string } | null) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		messageChannel.port1.onmessage = (event) => {
			settle(event.data as { success: boolean; error?: string });
		};

		// Hard timeout — if the SW never responds (e.g. it crashed, or
		// the message handler threw before posting back), the caller
		// must not hang forever. Fall through to direct CacheStorage
		// cleanup in that case.
		setTimeout(() => settle(null), timeoutMs);

		try {
			controller.postMessage({ type, ...payload }, [messageChannel.port2]);
		} catch (err) {
			settle({ success: false, error: (err as Error).message });
		}
	});
}

/**
 * Tells the active Service Worker to drop all CacheStorage entries it
 * owns. The SW (in `public/sw.js`) iterates `caches.keys()` and
 * deletes each cache; we wait for its success response via
 * MessageChannel so callers know the wipe completed before they
 * continue.
 *
 * Returns:
 *   - `true`  — the SW acknowledged the wipe
 *   - `false` — no active SW controller, the SW threw, or the timeout
 *     fired. The caller MUST fall back to direct `caches.delete()`
 *     in that case (see `clearClientCaches`).
 *
 * Background: `public/sw.js` previously exposed this handler but no
 * client-side code ever called it. The page-side `caches.delete()`
 * path was used instead, leaving the SW message handler as dead code.
 * This helper closes the loop so the SW is the single source of
 * truth for CacheStorage mutations.
 */
export async function clearAllCachesViaServiceWorker(): Promise<boolean> {
	const response = await postMessageToServiceWorker("CLEAR_ALL_CACHES");
	return response?.success ?? false;
}

/**
 * Tells the active Service Worker to drop only the search-index cache
 * (`tolo-v*-search`). The static asset cache is intentionally left
 * intact — it holds versioned bundles that are not identity-dependent.
 */
export async function clearSearchCacheViaServiceWorker(): Promise<boolean> {
	const response = await postMessageToServiceWorker("CLEAR_SEARCH_CACHE");
	return response?.success ?? false;
}

/**
 * Asks the active Service Worker to `skipWaiting()` so the new SW
 * activates immediately. Useful when a new SW is detected after a
 * deploy and the user is on a critical flow (logout, account switch)
 * where stale assets would be worse than a re-download.
 */
export async function skipWaitingViaServiceWorker(): Promise<void> {
	if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
		return;
	}
	const controller = navigator.serviceWorker.controller;
	if (!controller) return;
	// SKIP_WAITING in the SW does not post a response — it is fire and
	// forget. Fire without a MessageChannel to match.
	try {
		controller.postMessage({ type: "SKIP_WAITING" });
	} catch (error) {
		logger.debug("skipWaitingViaServiceWorker failed:", error);
	}
}

