'use client';

import { useEffect } from 'react';
import { useQueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  persistQueryClientSave,
} from '@tanstack/query-persist-client-core';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';

const CACHE_KEY = 'tolo-react-query-v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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
 * Restores TanStack Query cache from IndexedDB after mount and keeps it in
 * sync asynchronously. Flushes on pagehide / tab hidden so data survives
 * leaving the site.
 *
 * Previously used createSyncStoragePersister (localStorage) which blocked
 * the main thread on large caches. This version is fully non-blocking.
 */
export function ReactQueryPersistence() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const persister = createAsyncStoragePersister({
      storage: idbStorage,
      key: CACHE_KEY,
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
  }, [queryClient]);

  return null;
}

