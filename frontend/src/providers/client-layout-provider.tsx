'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { safeSetItem, safeGetItem, isBrowser } from '@/lib/safe-client-utils';
import { toast } from 'sonner';

const LAST_VISITED_PATH_KEY = 'thanawy:lastVisitedPath';
const SCROLL_POSITIONS_KEY = 'thanawy:scrollPosition';

// Auth pages that should NOT be saved as "last visited" (to prevent redirect loops)
const AUTH_PATHS = ['/login', '/register', '/admin-login', '/verify-email', '/forgot-password', '/reset-password'];
// A small flag stored in sessionStorage to prevent restore-loops during auth transitions
const RESTORE_GUARD_KEY = 'thanawy:restoredOnce';

function restoreInputState(el: Element, data: any) {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (el.checked !== data.checked) {
        el.checked = data.checked;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (el.type !== 'password' && el.type !== 'hidden') {
      if (el.value !== data.value) {
        el.value = data.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  } else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    if (el.value !== data.value) {
      el.value = data.value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

export default function ClientLayoutProvider({ children }: {children: React.ReactNode;}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isFirstRender = useRef(true);
  const isRestoring = useRef(false);

  const search = searchParams?.toString() ?? '';
  const fullPath = search ? `${pathname}?${search}` : pathname;

  // Restore last visited path if landing on the home page
  useEffect(() => {
    if (!isBrowser() || !pathname) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;

      // Only restore if we're at the root AND we haven't already restored in this tab session.
      // The RESTORE_GUARD_KEY prevents the loop:
      //   1. Middleware redirects authenticated user from /login → /
      //   2. ClientLayoutProvider would restore /dashboard → middleware sees user → redirects again...
      // By setting the guard after the first restore, we break the cycle.
      if (pathname === '/') {
        const alreadyRestored = sessionStorage.getItem(RESTORE_GUARD_KEY);
        if (alreadyRestored) return;

        const lastVisited = safeGetItem<string>(LAST_VISITED_PATH_KEY, { storageType: 'session' }) ||
          safeGetItem<string>(LAST_VISITED_PATH_KEY, { storageType: 'local' });

        // Do NOT restore to auth pages (that would create a loop with middleware auth checks)
        const isAuthPath = lastVisited && AUTH_PATHS.some(p => lastVisited.startsWith(p));

        if (lastVisited && lastVisited !== '/' && !isAuthPath) {
          sessionStorage.setItem(RESTORE_GUARD_KEY, '1');
          const timer = setTimeout(() => {
            router.push(lastVisited);
            toast.info('جاري استعادة جلستك السابقة...', {
              description: 'تمت إعادتك إلى آخر مكان كنت فيه.',
              duration: 3000
            });
          }, 150);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [pathname, router]);

  // Save current path — but NEVER save auth pages to prevent redirect loops
  useEffect(() => {
    if (!isBrowser() || !pathname) return;
    const isAuthPage = AUTH_PATHS.some(p => pathname.startsWith(p));
    if (isAuthPage) return;
    safeSetItem(LAST_VISITED_PATH_KEY, fullPath, { storageType: 'session' });
    // Clear the restore guard when user successfully navigates to a real page
    sessionStorage.removeItem(RESTORE_GUARD_KEY);
  }, [pathname, fullPath]);

  // Optimized Scroll Restoration Logic
  const saveScrollPosition = useCallback(() => {
    if (!isBrowser() || !pathname) return;

    try {
      const positions = safeGetItem<Record<string, number>>(SCROLL_POSITIONS_KEY, {
        storageType: 'local',
        fallback: {}
      }) || {};

      positions[fullPath] = window.scrollY;
      safeSetItem(SCROLL_POSITIONS_KEY, positions, { storageType: 'local' });
    } catch (_e) {
      // Ignore storage errors
    }
  }, [fullPath, pathname]);

  useEffect(() => {
    if (!isBrowser() || !pathname) return;

    const positions = safeGetItem<Record<string, number>>(SCROLL_POSITIONS_KEY, {
      storageType: 'local',
      fallback: {}
    }) || {};

    const savedScroll = positions[fullPath];
    if (savedScroll !== undefined) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScroll, behavior: 'instant' });
      });
    }

    // Use a single scroll listener with throttle (simulated via timeout)
    let lastScrollSave = 0;
    const onScroll = () => {
      const now = Date.now();
      if (now - lastScrollSave > 1000) { // Save at most once per second
        saveScrollPosition();
        lastScrollSave = now;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('beforeunload', saveScrollPosition);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', saveScrollPosition);
    };
  }, [pathname, fullPath, saveScrollPosition]);

  // Optimized Input Persistence
  useEffect(() => {
    if (!isBrowser() || !pathname) return;

    const INPUT_STATE_KEY = `thanawy:inputs:${fullPath}`;
    let saveTimeout: NodeJS.Timeout;

    const restoreInputs = () => {
      if (isRestoring.current) return;
      isRestoring.current = true;

      try {
        const savedInputs = safeGetItem<Record<string, any>>(INPUT_STATE_KEY, { storageType: 'local' });
        if (!savedInputs) return;

        Object.entries(savedInputs).forEach(([id, data]) => {
          const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
          if (!el || !(data && typeof data === 'object')) return;
          restoreInputState(el, data);
        });
      } catch (_e) {
        // Fail silently
      } finally {
        setTimeout(() => { isRestoring.current = false; }, 100);
      }
    };

    const handleFormChange = (_e: Event) => {
      if (isRestoring.current) return;

      const target = _e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const id = target.id || target.name;
      if (!id || target.tagName === 'BUTTON') return;
      if (target instanceof HTMLInputElement && (target.type === 'password' || target.type === 'hidden')) return;

      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const savedInputs = safeGetItem<Record<string, any>>(INPUT_STATE_KEY, { storageType: 'local', fallback: {} }) || {};
        
        if (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) {
          savedInputs[id] = { checked: target.checked, type: target.type };
        } else {
          savedInputs[id] = { value: target.value, type: target.tagName.toLowerCase() };
        }

        safeSetItem(INPUT_STATE_KEY, savedInputs, { storageType: 'local' });
      }, 1000); // Increased debounce to 1s
    };

    // Staged restoration
    const timer = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(restoreInputs, { timeout: 2000 });
      } else {
        setTimeout(restoreInputs, 500);
      }
    }, 1000);

    document.addEventListener('input', handleFormChange, { passive: true });
    document.addEventListener('change', handleFormChange, { passive: true });

    return () => {
      clearTimeout(timer);
      clearTimeout(saveTimeout);
      document.removeEventListener('input', handleFormChange);
      document.removeEventListener('change', handleFormChange);
    };
  }, [pathname, fullPath]);

  return <>{children}</>;
}