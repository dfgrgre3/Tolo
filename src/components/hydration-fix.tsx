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

    // Use MutationObserver for continuous cleaning
    const target = document.body || document.documentElement;
    if (target && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) {
                removeExtensionAttributes(node as Element);
              }
            });
          } else if (mutation.type === 'attributes' && mutation.target.nodeType === 1) {
            removeExtensionAttributes(mutation.target as Element);
          }
        });
      });

      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: attributesToRemove
      });

      return () => observer.disconnect();
    }
  }, []);

  return null;
}
