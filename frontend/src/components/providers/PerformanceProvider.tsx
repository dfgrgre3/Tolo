"use client";

import React from "react";
import { useUltraLiteMode, useEfficiencyMode } from "@/hooks/use-efficiency-mode";

/**
 * Performance Provider
 *
 * Collects Web Vitals and reports them to the analytics system.
 *
 * In efficiency/lite/ultra-lite mode, web-vitals reporting is disabled to save
 * bandwidth and CPU on weak devices. The web-vitals library is also
 * dynamically imported to avoid adding it to the initial bundle for
 * users in saver mode.
 */
export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const isEfficiency = useEfficiencyMode();
  const isUltraLite = useUltraLiteMode();

  React.useEffect(() => {
    // Only run in production or if explicitly enabled
    if (process.env.NODE_ENV === "development") return;

    // Skip web-vitals collection in efficiency/lite/ultra-lite modes to save CPU/bandwidth
    if (isEfficiency || isUltraLite) {
      return; // Don't collect or report web vitals on weak devices
    }

    // Dynamically import web-vitals to avoid loading it for efficiency-mode users
    import("web-vitals").then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      const reportWebVitals = (metric: { name: string; value: number; id: string }) => {
        const body = JSON.stringify({
          name: metric.name,
          value: metric.value,
          id: metric.id,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        });

        // Use sendBeacon if available for non-blocking report
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/analytics/web-vitals", body);
        } else {
          fetch("/api/analytics/web-vitals", {
            body,
            method: "POST",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
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
    });
  }, [isEfficiency, isUltraLite]);

  return <>{children}</>;
}
