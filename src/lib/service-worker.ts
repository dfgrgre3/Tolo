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
		const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
		if (registration) {
			await registration.unregister();
		}
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
				.filter((name) => name.startsWith(SW_CACHE_PREFIX))
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

export async function unregisterServiceWorker(): Promise<boolean> {
	if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
		return false;
	}

	try {
		const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
		if (registration) {
			const unregistered = await registration.unregister();
			logger.debug("Service Worker unregistered:", unregistered);
			return unregistered;
		}
		return false;
	} catch (error) {
		logger.error("Service Worker unregistration failed:", error);
		return false;
	}
}

export async function clearSearchCache(): Promise<boolean> {
	if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
		return false;
	}

	return new Promise((resolve) => {
		const messageChannel = new MessageChannel();
		messageChannel.port1.onmessage = (event) => {
			resolve(event.data.success);
		};

		if (navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage(
				{ type: "CLEAR_SEARCH_CACHE" },
				[messageChannel.port2]
			);
		} else {
			resolve(false);
		}
	});
}

export async function preCacheSearch(query: string, scope: string = "all"): Promise<boolean> {
	if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
		return false;
	}

	return new Promise((resolve) => {
		const messageChannel = new MessageChannel();
		messageChannel.port1.onmessage = (event) => {
			resolve(event.data.success);
		};

		if (navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage(
				{ type: "PRE_CACHE_SEARCH", query, scope },
				[messageChannel.port2]
			);
		} else {
			resolve(false);
		}
	});
}

export function isServiceWorkerSupported(): boolean {
	return typeof window !== "undefined" && "serviceWorker" in navigator;
}

