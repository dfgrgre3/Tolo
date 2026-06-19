'use client';

import { useState, useEffect } from 'react';

/**
 * useEfficiencyMode - Hook to detect and react to Efficiency Mode
 *
 * Returns true if the device is in efficiency mode (either by auto-detection
 * or user choice). Detects both the legacy `efficiency-mode` class and the
 * newer `lite-mode` class, as well as the `data-perf-mode` attribute.
 *
 * Note: We intentionally avoid useSyncExternalStore here because in React 19
 * with turbopack, it can cause RSC serialization errors like:
 * "Event handlers cannot be passed to Client Component props."
 * The useEffect pattern is safer and provides the same functionality.
 */
export function useEfficiencyMode(): boolean {
  const [isEfficiencyMode, setIsEfficiencyMode] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const checkMode = () => {
      const root = document.documentElement;
      const mode = root.getAttribute('data-perf-mode');
      return (
        root.classList.contains('efficiency-mode') ||
        root.classList.contains('lite-mode') ||
        root.classList.contains('ultra-lite-mode') ||
        mode === 'saver' ||
        mode === 'lite' ||
        mode === 'ultra-lite'
      );
    };

    // Initial check
    setIsEfficiencyMode(checkMode());

    // Watch for changes
    const observer = new MutationObserver(() => {
      setIsEfficiencyMode(checkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-perf-mode'],
    });

    return () => observer.disconnect();
  }, []);

  return isEfficiencyMode;
}

/**
 * Hook to get the current performance mode (or null during SSR).
 */
export function usePerformanceMode(): string | null {
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const getMode = () => document.documentElement.getAttribute('data-perf-mode');

    setMode(getMode());

    const observer = new MutationObserver(() => {
      setMode(getMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-perf-mode'],
    });

    return () => observer.disconnect();
  }, []);

  return mode;
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

    setIsUltraLite(checkUltraLite());

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