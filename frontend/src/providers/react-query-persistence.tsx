'use client';

import { useEffect } from 'react';
import { useQueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  persistQueryClientSave,
} from '@tanstack/query-persist-client-core';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const CACHE_KEY = 'tolo-react-query-v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function shouldPersistQuery(query: Parameters<typeof defaultShouldDehydrateQuery>[0]) {
  if ((query.meta as { persist?: boolean } | undefined)?.persist === true) {
    return defaultShouldDehydrateQuery(query);
  }
  return false;
}

/**
 * Restores TanStack Query cache from localStorage after mount and keeps it in sync.
 * Flushes on pagehide / tab hidden so data survives leaving the site.
 */
export function ReactQueryPersistence() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
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

    persistQueryClientRestore({
      queryClient,
      persister,
      maxAge: MAX_AGE_MS,
    } as unknown as Parameters<typeof persistQueryClientRestore>[0]).then(() => {
      unsubscribe = persistQueryClientSubscribe(
        saveOptions as unknown as Parameters<typeof persistQueryClientSubscribe>[0],
      );
    });

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

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
