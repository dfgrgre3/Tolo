/* Tolo Service Worker - Lightweight caching for performance
 *
 * Strategy:
 *  - Static assets (JS/CSS/images/fonts): cache-first with long TTL
 *  - HTML pages: stale-while-revalidate for instant loads
 *  - API requests: passthrough (no caching) to guarantee auth cookies/headers
 *    are always forwarded and stale 401s are never served.
 *  - Skips work on weak devices (efficiency-mode / lite-mode)
 *
 * The cache version is bumped on every breaking change so existing clients
 * drop their old caches (including any stale responses written by a previous
 * build). Bump it again whenever caching behaviour changes.
 */

const CACHE_VERSION = 'tolo-v10';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/',
  '/favicon.svg',
  '/manifest.json'
];

// Requests the service worker must leave entirely to the browser. See the
// fetch handler for why `perf-detect.js` is here.
const NO_INTERCEPT_PATHS = new Set(['/perf-detect.js']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Pre-cache best-effort, don't fail install
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', async (event) => {
  if (!event.data) return;

  const { type } = event.data;
  if (type === 'CLEAR_ALL_CACHES') {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      event.ports[0]?.postMessage({ success: true });
    } catch (err) {
      event.ports[0]?.postMessage({ success: false, error: err.message });
    }
  } else if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Identify Next.js internal RSC / Prefetch requests.
  //
  // Keep this list in sync with Next's `app-router-headers` constants. The
  // segment cache (Next 15+) issues per-segment prefetches that carry ONLY
  // `next-router-segment-prefetch`; missing it here let those requests fall
  // through to networkFirst, which surfaced rejections to the router as
  // "TypeError: Failed to fetch" from segment-cache/fetch.ts.
  const isNextRsc = url.searchParams.has('_rsc') ||
                    request.headers.has('rsc') ||
                    request.headers.has('next-router-state-tree') ||
                    request.headers.has('next-router-prefetch') ||
                    request.headers.has('next-router-segment-prefetch') ||
                    request.headers.has('next-hmr-refresh') ||
                    // Flight payload URLs, in case the headers were stripped by a
                    // proxy: Next serves these as /path.rsc and /path.prefetch.rsc.
                    url.pathname.endsWith('.rsc') ||
                    // Dev-only HMR + build manifests must always hit the network.
                    url.pathname.startsWith('/_next/webpack-hmr') ||
                    url.pathname.startsWith('/_next/static/development/');

  // Next.js RSC / prefetch requests: never intercept.
  //
  // These are never cached, so proxying them through the SW adds no benefit —
  // only a failure mode: any rejection inside the handler reaches the router as
  // "TypeError: Failed to fetch" ("Failed to fetch RSC payload ... Falling back
  // to browser navigation"). Returning without respondWith() lets the browser
  // perform the request natively, preserving its original mode, headers and
  // streaming semantics.
  if (isNextRsc) return;

  // ---------------------------------------------------------------------------
  // API requests: passthrough.
  //
  // We deliberately do NOT cache API responses because they are almost
  // always authenticated and depend on the current session. Caching them risks
  // serving stale 401/403/404 responses to a user who has since logged in or
  // whose data has changed.
  //
  // We also rebuild the request via fetch(url, init) so that credentials
  // (cookies such as `access_token` set by the Next.js middleware) are
  // explicitly forwarded. In some browsers the default `fetch(request)`
  // inside a Service Worker can lose credentials on cross-origin or
  // sub-resource requests, which is the root cause of the 401s / 404s reported
  // on navigation.
  // ---------------------------------------------------------------------------
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(passthroughApiRequest(request));
    return;
  }

  // Don't cache cross-origin requests (except for known CDNs)
  if (url.origin !== self.location.origin) {
    if (
      url.hostname === 'i.ytimg.com' ||
      url.hostname.endsWith('.ytimg.com') ||
      url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com'
    ) {
      // Cache images and fonts from these CDNs
      event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, 60 * 60 * 24 * 7));
    }
    return;
  }

  // Scripts preloaded by the document: never intercept.
  //
  // `perf-detect.js` is injected by next/script with `beforeInteractive`, which
  // also emits a <link rel="preload" as="script">. Answering the request from
  // CacheStorage means the preloaded response is never consumed, so the browser
  // discards it and logs a "cross-world service worker resource mismatch" /
  // "preloaded but not used" warning. Letting the browser handle it natively
  // keeps the preload matched; the file is small and HTTP-cacheable anyway.
  if (NO_INTERCEPT_PATHS.has(url.pathname)) return;

  // Static assets: cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages: bypass service worker cache entirely to prevent stale chunk references
  if (request.headers.get('accept')?.includes('text/html')) {
    return;
  }

  // Default: try network, fall back to cache
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|webp|avif|ico|gif)$/i.test(pathname);
}

/**
 * Pass-through proxy for API requests.
 *
 * - Forwards the original headers verbatim (Authorization, Cookie, etc.).
 * - Forces `credentials: 'include'` so HttpOnly cookies travel with the
 *   sub-resource fetch issued from the SW.
 * - Sets `cache: 'no-store'` to defeat any HTTP cache that might serve a
 *   stale 401 from disk.
 * - Never reads or writes from the CacheStorage for API responses.
 */
async function passthroughApiRequest(request) {
  const headers = new Headers(request.headers);

  // Build a fresh Request so we can guarantee the init flags we need.
  // Some browsers strip certain headers when the Request is reused as the
  // first argument to fetch(), particularly when the original was created
  // by the page fetch() with `credentials: 'include'`. Doing it manually
  // is more reliable across Chrome/Edge/Firefox/Safari.
  const init = {
    method: request.method,
    headers,
    credentials: 'include',
    mode: request.mode === 'navigate' ? 'cors' : (request.mode || 'cors'),
    cache: 'no-store',
    redirect: request.redirect || 'follow',
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
  };

  return fetch(request.url, init);
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_err) {
    // Return a tiny offline fallback for images
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, cacheName, _maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return a graceful offline response instead of rethrowing —
    // rethrowing causes "FetchEvent resulted in a network error" console spam.
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}
