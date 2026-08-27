'use client';

import { useState, useEffect } from 'react';
import { useEfficiency } from './use-efficiency';

/**
 * useEfficiencyMode - Single source of truth for "is the device in a
 * reduced-effects (efficiency) mode?".
 *
 * Delegates to the `EfficiencyProvider` context so we don't run a duplicate
 * DOM `MutationObserver` next to the one already inside `useEfficiency`.
 * All consumers (Header, video player, performance settings, …) are rendered
 * within `EfficiencyProvider`, so reading the context is always safe.
 */
export function useEfficiencyMode(): boolean {
  return useEfficiency().isEfficiencyMode;
}

/**
 * useUltraLiteMode - returns true if the device is in ultra-lite mode.
 * Ultra-lite is the most aggressive mode for very weak devices.
 */
export function useUltraLiteMode(): boolean {
  const [isUltraLite, setIsUltraLite] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const checkUltraLite = () => {
      const root = document.documentElement;
      return root.classList.contains('ultra-lite-mode') || root.getAttribute('data-perf-mode') === 'ultra-lite';
    };

    queueMicrotask(() => {
      setIsUltraLite(checkUltraLite());
    });

    const observer = new MutationObserver(() => {
      setIsUltraLite(checkUltraLite());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-perf-mode'],
    });

    return () => observer.disconnect();
  }, []);

  return isUltraLite;
}