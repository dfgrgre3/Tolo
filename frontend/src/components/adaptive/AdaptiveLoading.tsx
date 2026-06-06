"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback, Suspense } from "react";
import { useEfficiency as useEfficiencyCapabilities } from "@/hooks/use-efficiency";
import { useUltraLiteMode } from "@/hooks/use-efficiency-mode";
import { cn } from "@/lib/utils";

/* =====================================================================
   LazySection
   - Mounts children only when section is near viewport
   - Skips entirely on ultra-lite unless always-mount prop is true
   - Reserves space to avoid layout shift
   ===================================================================== */
export interface LazySectionProps {
  children: React.ReactNode;
  /** Force mount even if offscreen */
  forceMount?: boolean;
  /** Force unmount (e.g. in ultra-lite) */
  disableOnLite?: boolean;
  /** Disable on ultra-lite (default: true) */
  disableOnUltraLite?: boolean;
  /** Reserve space with minHeight (px) */
  minHeight?: number | string;
  /** Root margin for IntersectionObserver */
  rootMargin?: string;
  /** Threshold for IntersectionObserver */
  threshold?: number;
  /** Wrapper class */
  className?: string;
  /** Wrapper style */
  style?: React.CSSProperties;
  /** Placeholder when not in view (default: <div>) */
  fallback?: React.ReactNode;
}

export const LazySection = React.memo(function LazySection({
  children,
  forceMount = false,
  disableOnLite = false,
  disableOnUltraLite = true,
  minHeight,
  rootMargin = "100px",
  threshold = 0.01,
  className,
  style,
  fallback,
}: LazySectionProps) {
  const { effectiveMode } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // In performance mode, mount immediately
  const shouldEagerMount =
    forceMount || effectiveMode === "performance" || effectiveMode === "balanced";

  // Disable on lite/ultra-lite
  if (disableOnUltraLite && isUltraLite) {
    return (
      <div
        ref={ref}
        className={className}
        style={{ minHeight, ...style }}
        data-lazy-section="disabled-ultra-lite"
      />
    );
  }
  if (disableOnLite && (effectiveMode === "saver" || effectiveMode === "lite")) {
    return (
      <div
        ref={ref}
        className={className}
        style={{ minHeight, ...style }}
        data-lazy-section="disabled-lite"
      />
    );
  }

  useEffect(() => {
    if (shouldEagerMount) {
      setInView(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldEagerMount, rootMargin, threshold]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight, ...style }}
      data-lazy-section={inView ? "in-view" : "offscreen"}
    >
      {inView || shouldEagerMount ? (
        children
      ) : (
        fallback ?? (
          <div
            aria-hidden
            className="w-full h-full"
            style={{ minHeight: minHeight || "200px" }}
          />
        )
      )}
    </div>
  );
});

/* =====================================================================
   HeavyMount
   - For very heavy components (charts, AI assistant, video player)
   - Skips entirely on ultra-lite unless forceMount
   - Renders only after browser is idle (requestIdleCallback)
   ===================================================================== */
export interface HeavyMountProps {
  children: React.ReactNode;
  /** Minimum time to wait before mounting (ms) */
  delay?: number;
  /** Force mount on first render */
  forceMount?: boolean;
  /** Disable on ultra-lite (default: true) */
  disableOnUltraLite?: boolean;
  /** Wrapper class */
  className?: string;
  /** Fallback while loading */
  fallback?: React.ReactNode;
  /** Min height to reserve */
  minHeight?: number | string;
  /** Mount when in viewport instead of immediately */
  whenInView?: boolean;
}

export const HeavyMount = React.memo(function HeavyMount({
  children,
  delay = 0,
  forceMount = false,
  disableOnUltraLite = true,
  className,
  fallback,
  minHeight = "200px",
  whenInView = false,
}: HeavyMountProps) {
  const { effectiveMode } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // In performance/balanced mode, eager mount
  const shouldEagerMount =
    forceMount ||
    (!whenInView && (effectiveMode === "performance" || effectiveMode === "balanced"));

  // In ultra-lite, skip heavy components by default
  if (disableOnUltraLite && isUltraLite && !forceMount) {
    return (
      <div
        ref={ref}
        className={className}
        style={{ minHeight }}
        data-heavy-mount="disabled-ultra-lite"
      >
        {fallback}
      </div>
    );
  }

  useEffect(() => {
    if (shouldEagerMount) {
      setMounted(true);
      return;
    }
    let cancelled = false;
    const tryMount = () => {
      if (cancelled) return;
      setMounted(true);
    };

    if (typeof window === "undefined") {
      tryMount();
      return;
    }

    // Wait for idle time, with optional delay
    if (whenInView && ref.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (delay > 0) {
                setTimeout(tryMount, delay);
              } else if ("requestIdleCallback" in window) {
                (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
                  tryMount,
                  { timeout: 1500 }
                );
              } else {
                setTimeout(tryMount, 100);
              }
              observer.disconnect();
              break;
            }
          }
        },
        { rootMargin: "100px" }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }

    if (delay > 0) {
      const t = setTimeout(tryMount, delay);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(tryMount, {
        timeout: 2000,
      });
    } else {
      setTimeout(tryMount, 150);
    }
    return () => {
      cancelled = true;
    };
  }, [shouldEagerMount, delay, whenInView]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: mounted ? undefined : minHeight }}
      data-heavy-mount={mounted ? "mounted" : "pending"}
    >
      {mounted ? children : fallback}
    </div>
  );
});

/* =====================================================================
   FPSMonitor
   - Tracks frames per second in the background
   - When FPS drops below threshold, dispatches an event so the app
     can downgrade the experience automatically
   ===================================================================== */
export interface FPSMonitorProps {
  /** When FPS falls below this threshold for sustained time, dispatch a downgrade event */
  threshold?: number;
  /** Sample window (ms) */
  sampleWindow?: number;
  /** Disabled */
  disabled?: boolean;
}

export const FPSMonitor = React.memo(function FPSMonitor({
  threshold = 30,
  sampleWindow = 3000,
  disabled = false,
}: FPSMonitorProps) {
  const { effectiveMode, setMode, isAutoDetected } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();
  const lastDowngradeRef = useRef(0);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    if (effectiveMode === "performance" && !isAutoDetected) return; // user chose performance, respect
    if (isUltraLite) return; // already at lowest

    let raf = 0;
    let frames = 0;
    let lastSample = performance.now();
    let stop = false;

    const tick = () => {
      if (stop) return;
      frames += 1;
      const now = performance.now();
      if (now - lastSample >= sampleWindow) {
        const fps = Math.round((frames * 1000) / (now - lastSample));
        frames = 0;
        lastSample = now;
        // FPS too low: downgrade one level
        if (fps < threshold && now - lastDowngradeRef.current > 30000) {
          lastDowngradeRef.current = now;
          const order: Array<"performance" | "balanced" | "lite" | "saver" | "ultra-lite"> = [
            "performance",
            "balanced",
            "lite",
            "saver",
            "ultra-lite",
          ];
          const idx = order.indexOf(effectiveMode);
          if (idx >= 0 && idx < order.length - 1) {
            const next = order[idx + 1];
            // Auto-detect or user-chosen: respect auto-detect
            if (isAutoDetected) {
              // Switch to a slightly more aggressive mode
              setMode(next);
              try {
                window.dispatchEvent(
                  new CustomEvent("tolo-perf-downgrade", { detail: { from: effectiveMode, to: next, fps } })
                );
              } catch {
                // ignore
              }
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
    };
  }, [disabled, threshold, sampleWindow, effectiveMode, setMode, isAutoDetected, isUltraLite]);

  return null;
});

/* =====================================================================
   IdleRender
   - Renders children after the page becomes idle
   ===================================================================== */
export interface IdleRenderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  timeout?: number;
}

export const IdleRender = React.memo(function IdleRender({
  children,
  fallback,
  timeout = 1500,
}: IdleRenderProps) {
  const { effectiveMode } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();
  const [shouldRender, setShouldRender] = useState(effectiveMode === "performance" && !isUltraLite);

  useEffect(() => {
    if (shouldRender) return;
    if (typeof window === "undefined") return;
    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
        () => setShouldRender(true),
        { timeout }
      );
    } else {
      setTimeout(() => setShouldRender(true), Math.min(timeout, 200));
    }
  }, [shouldRender, timeout]);

  if (shouldRender) return <>{children}</>;
  return <>{fallback}</>;
});

/* =====================================================================
   AdaptiveSkeleton
   - Animated skeleton that respects efficiency mode
   ===================================================================== */
export interface AdaptiveSkeletonProps {
  className?: string;
  /** Width (default: w-full) */
  width?: string;
  /** Height (default: h-4) */
  height?: string;
  /** Custom rounded class */
  rounded?: string;
  /** Disable animation (always static) */
  noAnimation?: boolean;
}

export const AdaptiveSkeleton = React.memo(function AdaptiveSkeleton({
  className,
  width = "w-full",
  height = "h-4",
  rounded = "rounded-md",
  noAnimation = false,
}: AdaptiveSkeletonProps) {
  const { effectiveMode } = useEfficiencyCapabilities();
  const isLite = effectiveMode !== "performance";

  if (noAnimation || isLite) {
    return (
      <div
        role="status"
        aria-label="جاري التحميل"
        className={cn(width, height, rounded, "bg-muted", className)}
      />
    );
  }
  return (
    <div
      role="status"
      aria-label="جاري التحميل"
      className={cn(width, height, rounded, "bg-muted animate-pulse", className)}
    />
  );
});

/* =====================================================================
   AdaptiveBoundary
   - Suspense-like wrapper for heavy components
   ===================================================================== */
export interface AdaptiveBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Disable entirely on ultra-lite (return null) */
  disableOnUltraLite?: boolean;
  /** Minimum delay before showing fallback (ms) */
  minDelay?: number;
  className?: string;
  minHeight?: number | string;
}

export const AdaptiveBoundary = React.memo(function AdaptiveBoundary({
  children,
  fallback,
  disableOnUltraLite = false,
  minDelay = 200,
  className,
  minHeight,
}: AdaptiveBoundaryProps) {
  const isUltraLite = useUltraLiteMode();

  if (disableOnUltraLite && isUltraLite) {
    return null;
  }
  return (
    <div className={className} style={{ minHeight }}>
      <Suspense fallback={fallback ?? <AdaptiveSkeleton width="w-full" height="h-32" />}>
        {children}
      </Suspense>
    </div>
  );
});

/* =====================================================================
   SmartBoundary
   - Replaces heavy sections with simpler placeholders on weak devices
   ===================================================================== */
export interface SmartBoundaryProps {
  /** Children (heavy content) */
  children: React.ReactNode;
  /** Lightweight replacement for weak devices */
  liteFallback?: React.ReactNode;
  /** Disable on lite mode? */
  disableOnLite?: boolean;
  /** Disable on ultra-lite mode? */
  disableOnUltraLite?: boolean;
  className?: string;
  minHeight?: number | string;
}

export const SmartBoundary = React.memo(function SmartBoundary({
  children,
  liteFallback,
  disableOnLite = false,
  disableOnUltraLite = true,
  className,
  minHeight = "200px",
}: SmartBoundaryProps) {
  const { effectiveMode } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();

  if (disableOnUltraLite && isUltraLite) {
    return (
      <div className={className} style={{ minHeight }} data-smart-boundary="ultra-lite">
        {liteFallback}
      </div>
    );
  }
  if (disableOnLite && (effectiveMode === "saver" || effectiveMode === "lite")) {
    return (
      <div className={className} style={{ minHeight }} data-smart-boundary="lite">
        {liteFallback}
      </div>
    );
  }
  return <div className={className}>{children}</div>;
});
