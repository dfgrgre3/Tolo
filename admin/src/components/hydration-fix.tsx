"use client";

import { useEffect, useCallback } from "react";

/**
 * HydrationFix: تجميعة من الحلول لمشاكل الـ Hydration الناتجة عن إضافات المتصفح.
 * تم تحسينه ليكون فائق الأداء ولا يسبب تجمد المتصفح عبر استخدام استهداف محدد للعناصر.
 */
export function HydrationFix() {
  const cleanElements = useCallback(() => {
    // Only target elements that are known to cause hydration issues with common extensions
    const attributesToRemove = [
      'bis_skin_checked',
      'bis_register',
      'data-gr-ext-installed',
      'data-new-gr-c-s-check-loaded',
      'data-lastpass-icon',
      'data-dashlane-rid'
    ];

    try {
      const selectors = attributesToRemove.map(attr => `[${attr}]`).join(',');
      const elements = document.querySelectorAll(selectors);

      elements.forEach((el) => {
        attributesToRemove.forEach((attr) => {
          if (el.hasAttribute(attr)) el.removeAttribute(attr);
        });
      });

      // Cleanup system-specific processed IDs only if they exist on the root
      if (document.documentElement.hasAttribute('__processed_id')) {
        document.documentElement.removeAttribute('__processed_id');
      }
    } catch (_e) {
      // Fail silently
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let idleHandle: number;
    let observer: MutationObserver | null = null;

    const runCleanup = () => {
      if ('requestIdleCallback' in window) {
        idleHandle = window.requestIdleCallback(cleanElements);
      } else {
        cleanElements();
      }
    };

    const timer = setTimeout(runCleanup, 500);

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(cleanElements);
          } else {
            cleanElements();
          }
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      childList: false,
      subtree: false,
    });

    // Self-destruct observer after 5s — by then all extension attributes have been applied
    const observerTimeout = setTimeout(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(observerTimeout);
      if (idleHandle && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [cleanElements]);

  return null;
}