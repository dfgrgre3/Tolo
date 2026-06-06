'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

/**
 * useEfficiencyMode - Hook to detect and react to Efficiency Mode
 *
 * Returns true if the device is in efficiency mode (either by auto-detection
 * or user choice). Detects both the legacy `efficiency-mode` class and the
 * newer `lite-mode` class, as well as the `data-perf-mode` attribute.
 */
export function useEfficiencyMode(): boolean {
  // Use useSyncExternalStore to avoid hydration mismatches
  const subscribe = (callback: () => void) => {
    if (typeof window === 'undefined') return () => {};
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-perf-mode'],
    });
    return () => observer.disconnect();
  };

  const getSnapshot = (): boolean => {
    if (typeof document === 'undefined') return false;
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

  const getServerSnapshot = (): boolean => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook to get the current performance mode (or null during SSR).
 */
export function usePerformanceMode(): string | null {
  const subscribe = (callback: () => void) => {
    if (typeof window === 'undefined') return () => {};
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-perf-mode'],
    });
    return () => observer.disconnect();
  };

  const getSnapshot = (): string | null => {
    if (typeof document === 'undefined') return null;
    return document.documentElement.getAttribute('data-perf-mode');
  };

  const getServerSnapshot = (): string | null => null;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * useUltraLiteMode - returns true if the device is in ultra-lite mode.
 * Ultra-lite is the most aggressive mode for very weak devices.
 */
export function useUltraLiteMode(): boolean {
  const subscribe = (callback: () => void) => {
    if (typeof window === 'undefined') return () => {};
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-perf-mode'],
    });
    return () => observer.disconnect();
  };

  const getSnapshot = (): boolean => {
    if (typeof document === 'undefined') return false;
    const root = document.documentElement;
    return root.classList.contains('ultra-lite-mode') || root.getAttribute('data-perf-mode') === 'ultra-lite';
  };

  const getServerSnapshot = (): boolean => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
