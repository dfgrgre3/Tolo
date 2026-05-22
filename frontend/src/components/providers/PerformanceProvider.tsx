"use client";

import React from 'react';
import { onLCP, onFID, onCLS, onFCP, onTTFB } from 'web-vitals';

/**
 * Performance Provider
 * Collects Web Vitals and reports them to the analytics system
 */
export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Only run in production or if explicitly enabled
    if (process.env.NODE_ENV === 'development') return;

    const reportWebVitals = (metric: any) => {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });

      // Use sendBeacon if available for non-blocking report
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/web-vitals', body);
      } else {
        fetch('/api/analytics/web-vitals', {
          body,
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {
          // Silently fail
        });
      }
    };

    onCLS(reportWebVitals);
    onFID(reportWebVitals);
    onFCP(reportWebVitals);
    onLCP(reportWebVitals);
    onTTFB(reportWebVitals);
  }, []);

  return <>{children}</>;
}
