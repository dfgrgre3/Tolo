/**
 * Unified cache layer — الواجهة الموحّدة لنظام الكاش
 *
 * Server-side:
 *   - `serverCache` / `ServerCache` — two-tier (L1 memory + L2 Redis)
 *     read-through cache with single-flight, tags and SWR.
 *
 * Client-side:
 *   - `clearClientCaches` — wipes request-cache + React Query + SW caches
 *     on identity transitions.
 *   - `broadcastCacheClear` / `onCacheClearBroadcast` — cross-tab fan-out
 *     of cache wipes via BroadcastChannel.
 *
 * See `frontend/docs/cache-architecture.md` for the full layering model.
 */

export {
  ServerCache,
  serverCache,
  CACHE_TTL,
  type CacheMetrics,
  type GetOrSetOptions,
  type RedisLike,
  type RedisClientFactory,
  type ServerCacheOptions,
} from "./server-cache";

export {
  clearClientCaches,
  type ClearClientCachesOptions,
} from "./clear-client-caches";

export {
  broadcastCacheClear,
  onCacheClearBroadcast,
  CACHE_SYNC_CHANNEL,
  type CacheSyncMessage,
} from "./cross-tab-sync";
