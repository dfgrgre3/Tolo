/**
 * Centralized client-side cache invalidation.
 *
 * The application stacks three independent cache layers on top of the API:
 *
 *   1. `requestCache`          — in-flight GET deduplication (no body cache)
 *   2. TanStack Query + IDB    — authoritative data cache + persistence
 *   3. Service Worker / Cache  — static assets + HTML shell
 *
 * Each layer has its own invalidation API, and forgetting one of them
 * causes classic logout/login bugs:
 *
 *   - Stale `/auth/me` body surviving in TanStack Query
 *   - A pending GET promise for user A being coalesced onto a request from
 *     user B (request-cache identity leak)
 *   - Service Worker serving a stale HTML shell that hard-codes the old
 *     user's avatar / role badge in a static chunk
 *
 * This module is the SINGLE place where the three are invalidated together.
 * Call it from any identity transition (logout, account switch, MFA success,
 * forced session reset) instead of touching each cache individually.
 *
 * The function is fire-and-forget for the async parts (queryClient,
 * service worker). It MUST be safe to call multiple times in a row, and
 * from any sequence — partial failures must not leave the caller in a
 * half-cleared state.
 */

import { requestCache } from "@/lib/api/request-cache";
import { clearCsrfToken } from "@/lib/api/csrf";
import {
  clearAllCachesViaServiceWorker,
  skipWaitingViaServiceWorker,
} from "@/lib/service-worker";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Browser-only check — every cache we touch lives in the browser.
 * Calling this from a server context is a no-op so callers don't have
 * to gate the call themselves.
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Drops every Service Worker Cache Storage entry whose name belongs to
 * the app. We intentionally do NOT call `caches.keys()` + delete all —
 * third-party caches (e.g. `workbox-precache-v2-...` from a Chrome
 * extension) would be wiped, which is invasive and not our concern.
 *
 * The match prefix is the SW cache family used in `public/sw.js`
 * (`tolo-v*`, `tolo-search`).
 *
 * Strategy:
 *   1. If a Service Worker controller is active, ask the SW to wipe
 *      its own caches via the `CLEAR_ALL_CACHES` message. This is the
 *      authoritative path: the SW owns the CacheStorage namespace and
 *      any new cache names added in the future (e.g. `tolo-foo` in
 *      a future build) will be wiped automatically without changes
 *      here. Returns `true` on success.
 *   2. If no controller is present (first load before `clients.claim()`
 *      fires, or a private-browsing profile), fall back to deleting
 *      the well-known cache names directly. This is best-effort but
 *      better than leaking identity across an account switch.
 *
 * `skipWaiting` is requested on the SW so a newly installed worker
 * activates immediately, preventing the next navigation from hitting
 * the still-cached old SW shell.
 */
async function clearServiceWorkerCaches(): Promise<void> {
  if (!isBrowser() || !("caches" in window)) return;

  // Best-effort: ask the SW to skipWaiting so any newly installed
  // worker activates before we wipe the old caches. This is fire and
  // forget — if no SW is registered, it is a no-op.
  void skipWaitingViaServiceWorker();

  const swHandled = await clearAllCachesViaServiceWorker();
  if (swHandled) return;

  try {
    const cacheNames = await caches.keys();
    const ours = cacheNames.filter(
      (name) =>
        name.startsWith("tolo-") ||
        name.includes("next") ||
        name.includes("webpack") ||
        name.includes("turbopack"),
    );
    await Promise.all(ours.map((name) => caches.delete(name)));
  } catch {
    // Cache Storage unavailable (private browsing, disabled storage) —
    // best-effort. The next page load will re-bootstrap cleanly.
  }
}

export interface ClearClientCachesOptions {
  /**
   * The QueryClient instance to wipe. Required because TanStack Query
   * does not expose a global registry — callers must pass the same
   * client they use elsewhere in the app. Pass `undefined` to skip
   * the React Query clear (e.g. if the call site has not yet mounted
   * the provider).
   */
  queryClient?: QueryClient | null;
  /**
   * If `true`, also unregister the active Service Worker. This is
   * destructive (the next page load will refetch the entire static
   * bundle from the network) and is only appropriate on hard reset
   * flows like full sign-out from a shared device. Default: `false`.
   */
  unregisterServiceWorker?: boolean;
}

/**
 * Invalidates all client-side caches that hold identity-dependent data.
 *
 * Order matters:
 *   1. `queryClient.clear()` first, so any in-flight query that resolves
 *      after the cache is wiped has nowhere to land.
 *   2. `requestCache.clear()` + `setIdentity(null)` so any concurrent
 *      dedup'd GET from a previous identity is dropped and the next
 *      request from a new identity cannot be coalesced onto it.
 *   3. `clearCsrfToken()` so the next write request bootstraps a fresh
 *      token bound to the new session.
 *   4. Service Worker caches last — these are static, but wiping them
 *      on logout prevents a stale HTML shell from being served to the
 *      next user on a shared device.
 *
 * Returns a promise that resolves once the async parts (queryClient,
 * caches) are done. Safe to await or fire-and-forget.
 */
export async function clearClientCaches(
  options: ClearClientCachesOptions = {},
): Promise<void> {
  const { queryClient, unregisterServiceWorker = false } = options;

  // Synchronous in-memory clears first — these cannot fail and must
  // be observable to subsequent calls in the same tick.
  requestCache.clear();
  requestCache.setIdentity(null);
  clearCsrfToken();

  // QueryClient.clear() is synchronous but returns void; awaiting it
  // would not be useful. We still wrap it so future async work fits
  // the same shape without breaking callers.
  if (queryClient) {
    queryClient.clear();
  }

  // Async best-effort cleanup — runs in parallel, errors are swallowed.
  const asyncCleanup: Promise<unknown>[] = [clearServiceWorkerCaches()];

  if (unregisterServiceWorker && isBrowser() && "serviceWorker" in navigator) {
    asyncCleanup.push(
      navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((r) => r.unregister())),
      ),
    );
  }

  await Promise.allSettled(asyncCleanup);
}
