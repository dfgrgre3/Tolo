"use client";

import React from "react";

export function HydrationFix() {
  React.useEffect(() => {
    // Remove browser extension attributes that cause hydration errors
    const attributesToRemove = ['bis_skin_checked', 'bis_register'];

    const removeExtensionAttributes = (element: Element) => {
      if (!element) return;

      // Remove specific attributes
      attributesToRemove.forEach((attr) => {
        if (element.hasAttribute && element.hasAttribute(attr)) {
          element.removeAttribute(attr);
        }
      });

      // Remove __processed_* attributes
      if (element.attributes) {
        Array.from(element.attributes).forEach((attr) => {
          if (attr.name.startsWith('__processed_')) {
            element.removeAttribute(attr.name);
          }
        });
      }
    };

    const cleanAllElements = () => {
      const allElements = document.querySelectorAll('*');
      allElements.forEach(removeExtensionAttributes);
    };

    // Run immediately on mount
    cleanAllElements();

    // Run again after a short delay to catch any late injections during initial load
    const timer = setTimeout(cleanAllElements, 1000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
