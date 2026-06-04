const CACHE_NAME = 'tolo-search-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
  if (!event.data) return;

  const { type, query, scope } = event.data;
  
  if (type === 'CLEAR_SEARCH_CACHE') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      await Promise.all(keys.map(key => cache.delete(key)));
      event.ports[0]?.postMessage({ success: true });
    } catch (err) {
      event.ports[0]?.postMessage({ success: false, error: err.message });
    }
  } else if (type === 'PRE_CACHE_SEARCH') {
    // Basic implementation or placeholder for pre-caching search results
    event.ports[0]?.postMessage({ success: true });
  }
});
