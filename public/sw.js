// Service Worker for Offline Support and Data Efficiency
const CACHE_NAME = "thanawy-v3"; // Version bump for update
const DATA_CACHE_NAME = "thanawy-data-v2";
const IMAGE_CACHE_NAME = "thanawy-images-v1";
const FONT_CACHE_NAME = "thanawy-fonts-v1";
const OFFLINE_URL = "/offline";

const STATIC_ASSETS = [
    "/",
    "/offline",
    "/manifest.json",
    "/favicon.ico",
    "/globals.css",
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
                    .filter((name) => 
                        name !== CACHE_NAME && 
                        name !== DATA_CACHE_NAME && 
                        name !== IMAGE_CACHE_NAME && 
                        name !== FONT_CACHE_NAME
                    )
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
                        
                        return new Response(
                            JSON.stringify({ 
                                error: "Offline mode", 
                                message: "أنت الآن تعمل بدون اتصال. قد تكون هذه البيانات قديمة.",
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
                
                if (OFFLINE_NAV_ROUTES.some(route => url.pathname.startsWith(route))) {
                    return cache.match("/") || cache.match(OFFLINE_URL);
                }
                
                return cache.match(OFFLINE_URL);
            })
        );
    } 
    // 3. Fonts (Cache First)
    else if (request.destination === "font" || url.pathname.includes(".woff2")) {
        event.respondWith(
            caches.open(FONT_CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    return cachedResponse || fetch(request).then((networkResponse) => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
    // 4. Images (Cache First, Network Fallback) - Massive data saver
    else if (request.destination === "image" || /\.(png|jpg|jpeg|gif|svg|webp|avif)$/.test(url.pathname)) {
        event.respondWith(
            caches.open(IMAGE_CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached and update in background (Stale-while-revalidate)
                        fetch(request).then((networkResponse) => {
                            cache.put(request, networkResponse.clone());
                        }).catch(() => {});
                        return cachedResponse;
                    }
                    return fetch(request).then((networkResponse) => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
    // 5. Static Assets (Stale-while-revalidate)
    else {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                }).catch(() => {});
                
                return cachedResponse || fetchPromise;
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
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: data.tag || "notification",
        data: data.data || {},
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            const urlToOpen = event.notification.data.url || "/";
            if (clientList.length > 0) return clientList[0].focus();
            return clients.openWindow(urlToOpen);
        })
    );
});


