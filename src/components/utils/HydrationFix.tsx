"use client";

import React from "react";

export function HydrationFix() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            if (typeof window === 'undefined') return;
            
            // Remove browser extension attributes that cause hydration errors
            const attributesToRemove = ['bis_skin_checked', 'bis_register'];
            
            const removeExtensionAttributes = (element) => {
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
            
            // Run immediately
            cleanAllElements();
            
            // Run after DOM is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', cleanAllElements);
            } else {
              cleanAllElements();
            }
            
            // Run after React hydration with delays
            setTimeout(cleanAllElements, 0);
            setTimeout(cleanAllElements, 100);
            setTimeout(cleanAllElements, 500);
            
            // Use MutationObserver to watch for new elements
            const startObserver = () => {
              if (typeof MutationObserver === 'undefined') return;
              
              const target = document.body || document.documentElement;
              if (!target) {
                setTimeout(startObserver, 50);
                return;
              }
              
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  // Handle added nodes
                  mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                      removeExtensionAttributes(node);
                      // Also clean children
                      if (node.querySelectorAll) {
                        node.querySelectorAll('*').forEach(removeExtensionAttributes);
                      }
                    }
                  });
                  
                  // Handle attribute changes
                  if (mutation.type === 'attributes' && mutation.target) {
                    removeExtensionAttributes(mutation.target);
                  }
                });
              });
              
              observer.observe(target, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: attributesToRemove
              });
            };
            
            // Start observer after body is ready
            if (document.body) {
              startObserver();
            } else {
              document.addEventListener('DOMContentLoaded', startObserver);
            }
          })();
        `,
      }}
    />
  );
}
