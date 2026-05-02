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

    // Run cleanup once on mount using idle callback to avoid blocking hydration
    let idleHandle: number;
    const timer = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleHandle = (window as any).requestIdleCallback(cleanElements);
      } else {
        cleanElements();
      }
    }, 500);

    // Use a much less aggressive observer that only watches for root attribute changes
    // instead of the entire subtree. Subtree observation is a major performance killer.
    const observer = new MutationObserver((mutations) => {
      let shouldClean = false;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          shouldClean = true;
          break;
        }
      }
      
      if (shouldClean) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(cleanElements);
        } else {
          cleanElements();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      childList: false, // Don't watch every new node
      subtree: false    // Don't watch the entire tree
    });

    return () => {
      clearTimeout(timer);
      if (idleHandle && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleHandle);
      }
      observer.disconnect();
    };
  }, [cleanElements]);

  return null;
}