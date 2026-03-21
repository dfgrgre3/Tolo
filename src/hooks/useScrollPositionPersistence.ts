"use client";

import { useCallback } from "react";

export function useScrollPositionPersistence() {
  const saveScrollPosition = useCallback((key: string, position: number) => {
    try {
      localStorage.setItem(`scroll:${key}`, String(position));
    } catch {}
  }, []);

  const restoreScrollPosition = useCallback((key: string) => {
    try {
      const value = localStorage.getItem(`scroll:${key}`);
      return value ? Number(value) : 0;
    } catch {
      return 0;
    }
  }, []);

  return {
    saveScrollPosition,
    restoreScrollPosition,
  };
}
