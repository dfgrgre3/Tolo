'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { safeSetItem, safeGetItem, isBrowser } from '@/lib/safe-client-utils';
import { toast } from 'sonner';

export const LAST_VISITED_PATH_KEY = 'thanawy:lastVisitedPath';
export const SCROLL_POSITIONS_KEY = 'thanawy:scrollPosition';

export default function ClientLayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isFirstRender = useRef(true);
  
  const search = searchParams?.toString() ?? '';
  const fullPath = search ? `${pathname}?${search}` : pathname;

  // Restore last visited path if landing on the home page
  useEffect(() => {
    if (!isBrowser() || !pathname) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      // If we're at the root, check if we should redirect back to where they were
      if (pathname === '/') {
        const lastVisited = safeGetItem<string>(LAST_VISITED_PATH_KEY, { storageType: 'session' }) 
                         || safeGetItem<string>(LAST_VISITED_PATH_KEY, { storageType: 'local' });
        
        if (lastVisited && lastVisited !== '/') {
          // Add a small delay for Next.js to be ready
          const timer = setTimeout(() => {
            router.push(lastVisited);
            toast.info('جاري استعادة جلستك السابقة...', {
              description: 'تمت إعادتك إلى آخر مكان كنت فيه.',
              duration: 3000,
            });
          }, 100);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [pathname, router]);

  // Save current path
  useEffect(() => {
    if (!isBrowser() || !pathname) return;

    // Persist current path - use both for maximum reliability
    safeSetItem(LAST_VISITED_PATH_KEY, fullPath, { storageType: 'local' });
    safeSetItem(LAST_VISITED_PATH_KEY, fullPath, { storageType: 'session' });
  }, [pathname, fullPath]);

  // Scroll Restoration Logic
  const saveScrollPosition = useCallback(() => {
    if (!isBrowser() || !pathname) return;
    
    const positions = safeGetItem<Record<string, number>>(SCROLL_POSITIONS_KEY, { 
      storageType: 'local', 
      fallback: {} 
    }) || {};
    
    positions[fullPath] = window.scrollY;
    safeSetItem(SCROLL_POSITIONS_KEY, positions, { storageType: 'local' });
  }, [pathname, fullPath]);

  // Restore scroll position on path change
  useEffect(() => {
    if (!isBrowser() || !pathname) return;

    const positions = safeGetItem<Record<string, number>>(SCROLL_POSITIONS_KEY, { 
      storageType: 'local', 
      fallback: {} 
    }) || {};
    
    const savedScroll = positions[fullPath];
    if (savedScroll !== undefined) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScroll, behavior: 'instant' });
      });
    }

    // Save scroll on beforeunload or path change
    let scrollTimeout: NodeJS.Timeout;
    const onScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveScrollPosition, 150);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('beforeunload', saveScrollPosition);
    
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveScrollPosition();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', saveScrollPosition);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pathname, fullPath, saveScrollPosition]);

  // Global Input Persistence (Auto-save form fields and UI states)
  useEffect(() => {
    if (!isBrowser() || !pathname) return;

    const INPUT_STATE_KEY = `thanawy:inputs:${fullPath}`;

    // Restore inputs logic
    const restoreInputs = () => {
      const savedInputs = safeGetItem<Record<string, any>>(INPUT_STATE_KEY, { storageType: 'local' });
      if (savedInputs) {
        Object.entries(savedInputs).forEach(([id, data]) => {
          const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
          if (!el) return;

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
      }
    };

    // Save inputs on change
    const handleFormChange = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
      
      const id = target.id || (target as any).name;
      if (!id) return;

      // Skip sensitive fields
      if (target instanceof HTMLInputElement && (target.type === 'password' || target.type === 'hidden')) return;
      if (target.tagName === 'BUTTON') return;

      const savedInputs = safeGetItem<Record<string, any>>(INPUT_STATE_KEY, { storageType: 'local', fallback: {} }) || {};
      
      if (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) {
        savedInputs[id] = { checked: target.checked, type: target.type };
      } else {
        savedInputs[id] = { value: (target as any).value, type: target.tagName.toLowerCase() };
      }
      
      safeSetItem(INPUT_STATE_KEY, savedInputs, { storageType: 'local' });
    };

    // UI Persistence for elements with data-persist-id
    const saveUIAndElementScroll = () => {
      const UI_STATE_KEY = `thanawy:ui:${fullPath}`;
      const SCROLL_STATE_KEY = `thanawy:element-scroll:${fullPath}`;
      
      const persistentElements = document.querySelectorAll('[data-persist-id]');
      const scrollableElements = document.querySelectorAll('[data-persist-scroll-id]');
      
      const uiState: Record<string, any> = {};
      const scrollState: Record<string, { x: number, y: number }> = {};
      
      persistentElements.forEach(el => {
        const id = el.getAttribute('data-persist-id');
        if (!id) return;
        uiState[id] = {
          expanded: el.getAttribute('aria-expanded'),
          hidden: el.getAttribute('aria-hidden'),
          open: el.hasAttribute('open'),
        };
      });

      scrollableElements.forEach(el => {
        const id = el.getAttribute('data-persist-scroll-id');
        if (!id) return;
        scrollState[id] = { x: el.scrollLeft, y: el.scrollTop };
      });
      
      if (Object.keys(uiState).length > 0) {
        safeSetItem(UI_STATE_KEY, uiState, { storageType: 'local' });
      }
      if (Object.keys(scrollState).length > 0) {
        safeSetItem(SCROLL_STATE_KEY, scrollState, { storageType: 'local' });
      }
    };

    const restoreUIAndElementScroll = () => {
        const UI_STATE_KEY = `thanawy:ui:${fullPath}`;
        const SCROLL_STATE_KEY = `thanawy:element-scroll:${fullPath}`;
        
        const savedUI = safeGetItem<Record<string, any>>(UI_STATE_KEY, { storageType: 'local' });
        const savedScroll = safeGetItem<Record<string, { x: number, y: number }>>(SCROLL_STATE_KEY, { storageType: 'local' });
        
        if (savedUI) {
            Object.entries(savedUI).forEach(([id, state]) => {
                const el = document.querySelector(`[data-persist-id="${id}"]`);
                if (!el) return;
                if (state.expanded !== null) el.setAttribute('aria-expanded', state.expanded);
                if (state.hidden !== null) el.setAttribute('aria-hidden', state.hidden);
                if (state.open !== undefined) {
                    if (state.open) el.setAttribute('open', '');
                    else el.removeAttribute('open');
                }
            });
        }

        if (savedScroll) {
            Object.entries(savedScroll).forEach(([id, pos]) => {
                const el = document.querySelector(`[data-persist-scroll-id="${id}"]`);
                if (!el) return;
                el.scrollLeft = pos.x;
                el.scrollTop = pos.y;
            });
        }
    };

    // Initial restoration
    const timer = setTimeout(() => {
        restoreInputs();
        restoreUIAndElementScroll();
    }, 400);

    // Event listeners
    document.addEventListener('input', handleFormChange);
    document.addEventListener('change', handleFormChange);
    window.addEventListener('beforeunload', saveUIAndElementScroll);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveUIAndElementScroll();
    });

    return () => {
      clearTimeout(timer);
      document.removeEventListener('input', handleFormChange);
      document.removeEventListener('change', handleFormChange);
      window.removeEventListener('beforeunload', saveUIAndElementScroll);
    };
  }, [pathname, fullPath]);

  return <>{children}</>;
}

