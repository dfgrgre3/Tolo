"use client";

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker';

export function SWRegistration() {
  useEffect(() => {
    // Register service worker on mount
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker().catch(() => {
        // Silently fail in production, skip in development
      });
    }
  }, []);

  return null;
}
