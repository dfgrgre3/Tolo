"use client";

import { useEffect, useCallback } from "react";

/**
 * HydrationFix: تجميعة من الحلول لمشاكل الـ Hydration الناتجة عن إضافات المتصفح.
 * تم تحسينه ليكون فائق الأداء ولا يسبب تجمد المتصفح عبر استخدام استهداف محدد للعناصر.
 */
export function HydrationFix() {
  const cleanElements = useCallback(() => {
    // استهداف السمات المعروفة التي تسبب مشاكل فقط بدلاً من مسح كل شيء
    const selectors = [
    '[bis_skin_checked]',
    '[bis_register]',
    '[data-gr-ext-installed]',
    '[data-new-gr-c-s-check-loaded]',
    '[data-lastpass-icon]',
    '[data-dashlane-rid]',
    '[__processed_id]',
    '[style*="--processed"]'];


    try {
      const elements = document.querySelectorAll(selectors.join(','));

      elements.forEach((el) => {
        const attributesToRemove = [
        'bis_skin_checked',
        'bis_register',
        'data-gr-ext-installed',
        'data-new-gr-c-s-check-loaded',
        'data-lastpass-icon',
        'data-dashlane-rid'];


        attributesToRemove.forEach((attr) => {
          if (el.hasAttribute(attr)) el.removeAttribute(attr);
        });

        // مسح السمات التي تبدأ بـ __processed_
        if (el.attributes) {
          Array.from(el.attributes).forEach((attr) => {
            if (attr.name.startsWith('__processed_')) {
              el.removeAttribute(attr.name);
            }
          });
        }
      });
    } catch (_e) {

      // Silently fail if selector is invalid or parsing fails
    }}, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Run initial cleanup
    cleanElements();

    // Use MutationObserver to clean up elements added by extensions dynamically
    const observer = new MutationObserver((mutations) => {
      let shouldClean = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldClean = true;
          break;
        }
        if (mutation.type === 'attributes') {
          shouldClean = true;
          break;
        }
      }
      
      if (shouldClean) {
        cleanElements();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'bis_skin_checked',
        'bis_register',
        'data-gr-ext-installed',
        'data-new-gr-c-s-check-loaded',
        'data-lastpass-icon',
        'data-dashlane-rid'
      ]
    });

    return () => {
      observer.disconnect();
    };
  }, [cleanElements]);

  return null;
}