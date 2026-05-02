'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { safeSetItem, safeGetItem, isBrowser } from '@/lib/safe-client-utils';
import { toast } from 'sonner';

const LAST_VISITED_PATH_KEY = 'thanawy:lastVisitedPath';
const SCROLL_POSITIONS_KEY = 'thanawy:scrollPosition';

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

      // If we're at the root, check if we should redirect back to where they were
      if (pathname === '/') {
        const lastVisited = safeGetItem<string>(LAST_VISITED_PATH_KEY, { storageType: 'session' }) ||
        safeGetItem<string>(LAST_VISITED_PATH_KEY, { storageType: 'local' });

        if (lastVisited && lastVisited !== '/') {
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

  // Save current path
  useEffect(() => {
    if (!isBrowser() || !pathname) return;
    safeSetItem(LAST_VISITED_PATH_KEY, fullPath, { storageType: 'session' });
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
        (window as any).requestIdleCallback(restoreInputs, { timeout: 2000 });
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