'use client';

import React, { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export const LAST_VISITED_PATH_KEY = 'thanawy:lastVisitedPath';

export default function ClientLayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';

  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) {
      return;
    }

    // Skip auth routes to avoid redirect loops
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/auth/')
    ) {
      return;
    }

    const fullPath = search ? `${pathname}?${search}` : pathname;

    try {
      sessionStorage.setItem(LAST_VISITED_PATH_KEY, fullPath);
    } catch (sessionError) {
      try {
        localStorage.setItem(LAST_VISITED_PATH_KEY, fullPath);
      } catch (storageError) {
        console.warn('Unable to persist last visited path for redirect:', storageError);
      }
    }
  }, [pathname, search]);

  return <>{children}</>;
}
