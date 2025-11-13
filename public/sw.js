// Service Worker for Offline Search Support and Push Notifications
const CACHE_NAME = "thanawy-search-v1";
const SEARCH_CACHE_NAME = "thanawy-search-results-v1";
const OFFLINE_PAGE = "/offline";

// Install event - cache essential resources
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll([
				"/",
				"/offline",
				"/api/search?q=&scope=all&limit=8", // Empty search for offline fallback
			]);
		})
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name !== CACHE_NAME && name !== SEARCH_CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	self.clients.claim();
});

// Fetch event - handle network requests with offline fallback
self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only handle search API requests
	if (url.pathname === "/api/search" && request.method === "GET") {
		event.respondWith(
			caches.match(request).then((cachedResponse) => {
				// Try network first
				return fetch(request)
					.then((response) => {
						// Clone the response for caching
						const responseToCache = response.clone();

						// Cache successful responses
						if (response.status === 200) {
							caches.open(SEARCH_CACHE_NAME).then((cache) => {
								// Store with query params as key
								cache.put(request, responseToCache);
							});
						}

						return response;
					})
					.catch(() => {
						// Network failed, try cache
						if (cachedResponse) {
							return cachedResponse;
						}

						// No cache, return offline fallback
						return new Response(
							JSON.stringify({
								results: [],
								offline: true,
								message: "You are offline. Showing cached results.",
							}),
							{
								headers: { "Content-Type": "application/json" },
							}
						);
					});
			})
		);
	} else if (request.mode === "navigate") {
		// Handle navigation requests
		event.respondWith(
			fetch(request).catch(() => {
				return caches.match(OFFLINE_PAGE) || caches.match("/");
			})
		);
	}
});

// Push notification handler
self.addEventListener("push", (event) => {
	const data = event.data ? event.data.json() : {};
	const title = data.title || "إشعار جديد";
	const options = {
		body: data.message || data.body || "",
		icon: data.icon || "/icon-192x192.png",
		badge: data.badge || "/icon-192x192.png",
		image: data.image,
		tag: data.tag || data.id || "notification",
		data: data.data || {},
		requireInteraction: data.requireInteraction || false,
		actions: data.actions || [],
	};

	event.waitUntil(
		self.registration.showNotification(title, options)
	);
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	const data = event.notification.data;
	const urlToOpen = data.url || data.link || "/";

	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
			// Check if there's already a window open
			for (let i = 0; i < clientList.length; i++) {
				const client = clientList[i];
				if (client.url === urlToOpen && "focus" in client) {
					return client.focus();
				}
			}
			// Open new window
			if (clients.openWindow) {
				return clients.openWindow(urlToOpen);
			}
		})
	);
});

// Message handler for cache management and push subscription
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "CLEAR_SEARCH_CACHE") {
		caches.delete(SEARCH_CACHE_NAME).then(() => {
			event.ports[0].postMessage({ success: true });
		});
	}

	if (event.data && event.data.type === "PRE_CACHE_SEARCH") {
		const { query, scope } = event.data;
		const url = `/api/search?q=${encodeURIComponent(query)}&scope=${scope}&limit=8`;
		
		fetch(url)
			.then((response) => {
				if (response.ok) {
					return caches.open(SEARCH_CACHE_NAME).then((cache) => {
						return cache.put(url, response);
					});
				}
			})
			.then(() => {
				event.ports[0].postMessage({ success: true });
			})
			.catch(() => {
				event.ports[0].postMessage({ success: false });
			});
	}
});

