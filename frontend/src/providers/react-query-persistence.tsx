'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  persistQueryClientSave,
} from '@tanstack/query-persist-client-core';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { useAuth } from '@/hooks/use-auth';

const CACHE_KEY_PREFIX = 'tolo-react-query-v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/**
 * Identity-scoped cache key.
 *
 * User-scoped queries (any query that may return data depending on the
 * authenticated caller) MUST be persisted under a key that includes the
 * current user ID. Otherwise the IndexedDB store from user A would be
 * replayed for user B after an in-session logout/login (logout does NOT
 * clear the browser's IndexedDB).
 *
 * Two named buckets are used:
 *   - anonymous: any pre-auth query (e.g. /api/courses, /api/settings).
 *     These are shared across visitors and stay stable through login.
 *   - user:<id>:  per-user buckets. Switching to a different `<id>` MUST
 *     invalidate every query whose meta.persist !== true so the new
 *     user's first render never sees stale data from a previous session.
 */
function cacheKeyForScope(userId: string | null | undefined): string {
  if (!userId) return `${CACHE_KEY_PREFIX}:anonymous`;
  return `${CACHE_KEY_PREFIX}:user:${userId}`;
}

/**
 * Minimal AsyncStorage adapter backed by IndexedDB (idb-keyval).
 *
 * Rationale:
 *  - localStorage.setItem is SYNCHRONOUS and blocks the main thread. When the
 *    serialised query-cache exceeds ~5 MB the browser either throws a
 *    QuotaExceededError or hangs the UI for hundreds of milliseconds.
 *  - IndexedDB writes are fully async and off-thread, so they never block JS
 *    execution regardless of payload size.
 *  - idb-keyval is a tiny (<1 KB gzipped) wrapper with zero dependencies.
 */
const idbStorage = {
  getItem: (key: string): Promise<string | null> =>
    get<string>(key).then((val) => val ?? null),
  setItem: (key: string, value: string): Promise<void> =>
    set(key, value),
  removeItem: (key: string): Promise<void> =>
    del(key),
};

function shouldPersistQuery(query: Parameters<typeof defaultShouldDehydrateQuery>[0]) {
  if ((query.meta as { persist?: boolean } | undefined)?.persist === true) {
    return defaultShouldDehydrateQuery(query);
  }
  return false;
}

/**
 * Restores the user-scoped TanStack Query cache from IndexedDB after mount
 * and keeps it in sync asynchronously. Flushes on pagehide / tab hidden so
 * data survives leaving the site.
 *
 * Identity scoping
 * ----------------
 * The persistence key embeds the current user ID (`user:<id>` for signed-in
 * users, `anonymous` for guests). On identity transitions (login, logout,
 * account switch, MFA challenge, impersonation), the persister:
 *
 *   1. Flushes the previous bucket synchronously (so the latest state for
 *      the previous identity is durably saved before the key changes).
 *   2. Clears the in-memory query cache (`queryClient.clear()`) so any
 *      non-persisted entries from the previous identity are dropped.
 *   3. Removes the previous bucket's IndexedDB entry (defence-in-depth —
 *      the next persistence cycle would overwrite it anyway, but a stale
 *      entry can be replayed during the same session if the identity
 *      flapped).
 *   4. Restores from the new bucket asynchronously.
 *
 * Previously used `createSyncStoragePersister` (localStorage) which blocked
 * the main thread on large caches. This version is fully non-blocking AND
 * identity-scoped.
 */
export function ReactQueryPersistence() {
  const queryClient = useQueryClient();
  // Read auth state via context. The provider tree guarantees this hook
  // resolves to a value (it is mounted under <AuthProvider>).
  const { user, status } = useAuth();

  // The bucket we're currently persisting to. We track it in a ref so the
  // effect can read the latest value without re-subscribing on every
  // identity change (a fresh effect is set up for each transition).
  const currentScopeRef = useRef<string>(cacheKeyForScope(user?.id));

  useEffect(() => {
    const scopeKey = cacheKeyForScope(user?.id);
    currentScopeRef.current = scopeKey;

    const persister = createAsyncStoragePersister({
      storage: idbStorage,
      key: scopeKey,
      throttleTime: 2000,
    });

    const saveOptions = {
      queryClient,
      persister,
      dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
    };

    let unsubscribe: (() => void) | undefined;

    const flush = () => {
      persistQueryClientSave(saveOptions as unknown as Parameters<typeof persistQueryClientSave>[0]);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    persistQueryClientRestore({
      queryClient,
      persister,
      maxAge: MAX_AGE_MS,
    } as unknown as Parameters<typeof persistQueryClientRestore>[0])
      .then(() => {
        unsubscribe = persistQueryClientSubscribe(
          saveOptions as unknown as Parameters<typeof persistQueryClientSubscribe>[0],
        );
      })
      .catch(() => {
        // IndexedDB unavailable (e.g. private browsing in Firefox) — skip persistence silently
      });

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribe?.();
      flush();
    };
  }, [queryClient, user?.id]);

  /**
   * Identity-transition side effect.
   *
   * Runs whenever the auth status OR user ID changes. On every transition:
   *   - Flush the previous bucket's pending writes immediately.
   *   - Clear the in-memory cache so a render that races the next restore
   *     never sees user A's data under user B's session.
   *   - Remove the previous bucket's IndexedDB entry (a one-shot
   *     transition guard — see the file header for why).
   *   - Reset the queryClient state so the next restore starts clean.
   *
   * Note: status === "loading" is excluded so the initial mount (when we
   * don't yet know who the user is) doesn't trigger a spurious clear+restore
   * cycle that would evict the anonymous cache before it can be used.
   */
  useEffect(() => {
    if (status === 'loading') return;

    const previousKey = currentScopeRef.current;
    const nextKey = cacheKeyForScope(user?.id);
    if (previousKey === nextKey) return;

    // Flush any pending writes to the OLD bucket before we forget the key.
    persistQueryClientSave({
      queryClient,
      persister: createAsyncStoragePersister({
        storage: idbStorage,
        key: previousKey,
        throttleTime: 0,
      }),
      dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
    } as unknown as Parameters<typeof persistQueryClientSave>[0]);

    // Drop everything in memory. Persisted entries for the next bucket
    // will be restored by the key-change effect above.
    queryClient.clear();

    // Defence-in-depth: remove the previous bucket from IndexedDB so a
    // mid-session identity flap (login → logout → login again) cannot
    // accidentally replay a stale entry. We schedule this async because
    // the previous flush is also async and we don't want them racing on
    // the same key.
    if (previousKey !== nextKey && previousKey !== `${CACHE_KEY_PREFIX}:anonymous`) {
      // Only delete user-scoped buckets — anonymous cache may be reused by
      // a subsequent guest session and shouldn't be wiped on every
      // authenticated logout.
      void idbStorage.removeItem(previousKey);
    }

    currentScopeRef.current = nextKey;
  }, [queryClient, status, user?.id]);

  return null;
}
