// Service Worker for Offline Support and Push Notifications
const CACHE_NAME = "thanawy-v2";
const DATA_CACHE_NAME = "thanawy-data-v1";
const OFFLINE_URL = "/offline";

const STATIC_ASSETS = [
    "/",
    "/offline",
    "/manifest.json",
    "/favicon.ico",
    "/globals.css",
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
];

const OFFLINE_NAV_ROUTES = [
    "/dashboard",
    "/schedule",
    "/tasks",
    "/achievements",
    "/profile"
];

// Install event - cache essential resources
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
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
                    .filter((name) => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. API Requests (Network First, Cache Fallback)
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache clones for successful GET requests
                    if (response.status === 200 && request.method === "GET") {
                        const responseToCache = response.clone();
                        caches.open(DATA_CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Try to serve from cache if network fails
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) return cachedResponse;
                        
                        // Default offline JSON response
                        return new Response(
                            JSON.stringify({ 
                                error: "Offline mode", 
                                message: "You are currently offline. This data may be out of date.",
                                isOffline: true 
                            }),
                            { headers: { "Content-Type": "application/json" } }
                        );
                    });
                })
        );
    } 
    // 2. Navigation Requests
    else if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(async () => {
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(request);
                if (cachedResponse) return cachedResponse;
                
                // If it's a known interactive route, try to serve "/" (Next.js client-side will handle)
                if (OFFLINE_NAV_ROUTES.some(route => url.pathname.startsWith(route))) {
                    return cache.match("/") || cache.match(OFFLINE_URL);
                }
                
                return cache.match(OFFLINE_URL);
            })
        );
    } 
    // 3. Static Assets (Cache First, Network Fallback)
    else {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                return cachedResponse || fetch(request).then((response) => {
                    // Don't cache everything, just safe defaults or already cached
                    return response;
                });
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
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

