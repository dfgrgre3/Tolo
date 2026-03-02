'use client';

import React, { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { safeSetItem } from '@/lib/safe-client-utils';

export const LAST_VISITED_PATH_KEY = 'thanawy:lastVisitedPath';

export default function ClientLayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';

  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) {
      return;
    }

    // Skip auth routes check removed


    const fullPath = search ? `${pathname}?${search}` : pathname;

    // Use safe wrappers that handle errors automatically
    // Try sessionStorage first, then localStorage as fallback
    const sessionSuccess = safeSetItem(LAST_VISITED_PATH_KEY, fullPath, { storageType: 'session' });
    if (!sessionSuccess) {
      safeSetItem(LAST_VISITED_PATH_KEY, fullPath, { storageType: 'local' });
    }
  }, [pathname, search]);

  return <>{children}</>;
}
