"use client";

import React, { useEffect, useCallback } from "react";

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
      '[style*="--processed"]'
    ];

    try {
      const elements = document.querySelectorAll(selectors.join(','));
      
      elements.forEach((el) => {
        const attributesToRemove = [
          'bis_skin_checked',
          'bis_register',
          'data-gr-ext-installed',
          'data-new-gr-c-s-check-loaded',
          'data-lastpass-icon',
          'data-dashlane-rid'
        ];

        attributesToRemove.forEach(attr => {
          if (el.hasAttribute(attr)) el.removeAttribute(attr);
        });

        // مسح السمات التي تبدأ بـ __processed_
        if (el.attributes) {
          Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('__processed_')) {
              el.removeAttribute(attr.name);
            }
          });
        }
      });
    } catch (e) {
      // Silently fail if selector is invalid or parsing fails
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // تشغيل التنظيف على الفور بعد التحميل
    const immediateTimer = setTimeout(cleanElements, 100);
    
    // تشغيل التنظيف بعد فترة بسيطة للتعامل مع العناصر التي تضاف لاحقاً
    const delayTimer = setTimeout(cleanElements, 1000);

    return () => {
      clearTimeout(immediateTimer);
      clearTimeout(delayTimer);
    };
  }, [cleanElements]);

  return null;
}
