'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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

let persistenceQueue = Promise.resolve();

function enqueuePersistence(task: () => Promise<void>): Promise<void> {
  const next = persistenceQueue.then(task, task);
  persistenceQueue = next.catch(() => undefined);
  return next;
}

function shouldPersistQuery(query: Parameters<typeof defaultShouldDehydrateQuery>[0]) {
  // Persist successful queries by default. The cache is already isolated by
  // the authenticated user's bucket (`cacheKeyForScope`), so requiring every
  // query to opt in makes the persistence layer silently useless: currently
  // none of the application's queries set `meta.persist: true`.
  //
  // Sensitive or highly volatile queries can still opt out explicitly with
  // `meta: { persist: false }`.
  if ((query.meta as { persist?: boolean } | undefined)?.persist === false) {
    return false;
  }

  return defaultShouldDehydrateQuery(query);
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
export function ReactQueryPersistence({ children }: { children?: ReactNode } = {}) {
  const queryClient = useQueryClient();
  // Read auth state via context. The provider tree guarantees this hook
  // resolves to a value (it is mounted under <AuthProvider>).
  const { user, status, authSessionVersion } = useAuth();

  // The bucket we're currently persisting to. We track it in a ref so the
  // effect can read the latest value without re-subscribing on every
  // identity change (a fresh effect is set up for each transition).
  const currentScopeRef = useRef<string>(cacheKeyForScope(user?.id));
  const activeSessionVersionRef = useRef<number | null>(null);
  const transitionGenerationRef = useRef(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Gates the first render of `children` until the initial IndexedDB
  // restore has settled. Without this, `useQuery` consumers mount and
  // fire their network fetch in the SAME commit as this component (this
  // effect only runs afterwards), so the restored cache always arrives
  // too late to be used — every refresh looked like a cold, un-cached
  // load. Mirrors what `PersistQueryClientProvider` does upstream.
  // Deliberately never flips back to `false` on later identity
  // transitions (login/logout) — those already clear/restore correctly
  // in the background, and re-hiding already-rendered UI would just
  // cause a jarring blank flash.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // NOTE: we intentionally do NOT wait for `status !== 'loading'` here.
    // Anonymous-safe data (courses, public settings, …) should restore
    // from its bucket immediately on mount; once auth resolves, the
    // transition logic below detects the identity change (previousKey
    // !== nextKey) and re-clears/restores under the correct user bucket.
    // Gating the whole restore on the auth network round-trip is what
    // made caching effectively invisible before.
    const nextKey = cacheKeyForScope(user?.id);
    const previousKey = currentScopeRef.current;
    const isSessionTransition =
      previousKey !== nextKey || activeSessionVersionRef.current !== authSessionVersion;
    const generation = ++transitionGenerationRef.current;
    const persister = createAsyncStoragePersister({
      storage: idbStorage,
      key: nextKey,
      throttleTime: 2000,
    });
    const saveOptions = {
      queryClient,
      persister,
      dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
    };
    let cancelled = false;

    const flush = () => {
      void enqueuePersistence(() =>
        persistQueryClientSave(saveOptions as unknown as Parameters<typeof persistQueryClientSave>[0]),
      );
    };

    const runTransition = async () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;

      if (isSessionTransition) {
        await enqueuePersistence(async () => {
          await persistQueryClientSave({
            queryClient,
            persister: createAsyncStoragePersister({
              storage: idbStorage,
              key: previousKey,
              throttleTime: 0,
            }),
            dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
          } as unknown as Parameters<typeof persistQueryClientSave>[0]);

          if (previousKey !== nextKey && previousKey !== `${CACHE_KEY_PREFIX}:anonymous`) {
            await idbStorage.removeItem(previousKey);
          }
        });

        if (cancelled || generation !== transitionGenerationRef.current) return;
        queryClient.clear();
      }

      if (cancelled || generation !== transitionGenerationRef.current) return;

      try {
        await persistQueryClientRestore({
          queryClient,
          persister,
          maxAge: MAX_AGE_MS,
        } as unknown as Parameters<typeof persistQueryClientRestore>[0]);
      } catch {
        // IndexedDB unavailable (e.g. private browsing in Firefox) — skip persistence silently
      }

      if (cancelled || generation !== transitionGenerationRef.current) return;
      currentScopeRef.current = nextKey;
      activeSessionVersionRef.current = authSessionVersion;
      unsubscribeRef.current = persistQueryClientSubscribe(
        saveOptions as unknown as Parameters<typeof persistQueryClientSubscribe>[0],
      );
      setIsReady(true);
    };

    void runTransition();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      flush();
    };
  }, [authSessionVersion, queryClient, status, user?.id]);

  if (!isReady) return null;
  return <>{children}</>;
}
