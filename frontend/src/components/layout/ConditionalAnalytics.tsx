"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useUltraLiteMode } from "@/hooks/use-efficiency-mode";

/**
 * ConditionalAnalytics - Only loads Vercel Analytics when the device
 * is NOT in efficiency/lite/ultra-lite mode.
 *
 * This saves bandwidth and CPU on weak devices and on slow connections.
 * The components are dynamically imported via next/dynamic to avoid pulling
 * them into the initial bundle for efficiency-mode users.
 */
const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
  { ssr: false }
);

export function ConditionalAnalytics() {
  const isUltraLite = useUltraLiteMode();
  const [shouldLoad, setShouldLoad] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Check efficiency mode
    const root = document.documentElement;
    const mode = root.getAttribute("data-perf-mode");
    const inEfficiency =
      root.classList.contains("efficiency-mode") ||
      root.classList.contains("lite-mode") ||
      root.classList.contains("ultra-lite-mode") ||
      mode === "saver" ||
      mode === "lite" ||
      mode === "ultra-lite";

    // Also disable on slow connections / save-data
    let inSaver = inEfficiency;
    try {
      const conn =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;
      if (conn?.saveData) inSaver = true;
      if (
        conn?.effectiveType &&
        ["slow-2g", "2g", "3g"].includes(conn.effectiveType)
      ) {
        inSaver = true;
      }
    } catch {
      // ignore
    }

    setShouldLoad(!inSaver);
  }, [isUltraLite]);

  // Don't render anything until we know
  if (shouldLoad !== true) return null;

  return <Analytics />;
}

/**
 * ConditionalSpeedInsights - Only loads Vercel Speed Insights when
 * device is not in efficiency mode.
 */
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => ({ default: m.SpeedInsights })),
  { ssr: false }
);

export function ConditionalSpeedInsights() {
  const isUltraLite = useUltraLiteMode();
  const [shouldLoad, setShouldLoad] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const mode = root.getAttribute("data-perf-mode");
    const inEfficiency =
      root.classList.contains("efficiency-mode") ||
      root.classList.contains("lite-mode") ||
      root.classList.contains("ultra-lite-mode") ||
      mode === "saver" ||
      mode === "lite" ||
      mode === "ultra-lite";

    let inSaver = inEfficiency;
    try {
      const conn =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;
      if (conn?.saveData) inSaver = true;
    } catch {
      // ignore
    }

    setShouldLoad(!inSaver);
  }, [isUltraLite]);

  if (shouldLoad !== true) return null;

  return <SpeedInsights />;
}
