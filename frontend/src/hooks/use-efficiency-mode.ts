'use client';

import { useState, useEffect } from 'react';

/**
 * useEfficiencyMode - Hook to detect and react to Efficiency Mode
 * 
 * Returns true if the device is in efficiency mode (either by auto-detection or user choice).
 */
export function useEfficiencyMode() {
  const [isEfficiencyMode, setIsEfficiencyMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check initial state
    const checkMode = () => {
      const hasClass = document.documentElement.classList.contains('efficiency-mode');
      setIsEfficiencyMode(hasClass);
    };

    checkMode();

    // Observe changes to the class list of documentElement
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkMode();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return isEfficiencyMode;
}
