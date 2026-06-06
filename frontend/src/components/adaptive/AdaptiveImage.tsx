"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image, { ImageProps } from "next/image";
import { useEfficiency, useUltraLiteMode } from "@/hooks/use-efficiency-mode";
import { useEfficiency as useEfficiencyCapabilities } from "@/hooks/use-efficiency";
import { cn } from "@/lib/utils";

export interface AdaptiveImageProps
  extends Omit<ImageProps, "src" | "quality" | "placeholder" | "loading"> {
  src: string;
  alt: string;
  /** Image is critical above the fold (eager load) */
  priority?: boolean;
  /** Override quality detection */
  forceLowQuality?: boolean;
  /** Custom blur placeholder color */
  blurColor?: string;
  /** Show low-quality placeholder while loading */
  showPlaceholder?: boolean;
  /** Custom aspect ratio (e.g. "16/9") */
  aspectRatio?: string;
  /** Optional class for the wrapper */
  wrapperClassName?: string;
}

/**
 * AdaptiveImage - Image component that adapts quality based on device capabilities.
 *
 * Features:
 *  - Picks lower quality (20-50%) for weak devices (lite/saver/ultra-lite)
 *  - Uses smaller sizes when DPR or viewport is small
 *  - Skips blur placeholder in ultra-lite to save CPU
 *  - Lazy loads by default unless priority
 *  - Skips preload on 2G/save-data connections
 */
export const AdaptiveImage = React.memo(function AdaptiveImage({
  src,
  alt,
  priority = false,
  forceLowQuality = false,
  blurColor = "#f0f0f0",
  showPlaceholder = true,
  aspectRatio,
  wrapperClassName,
  className,
  sizes,
  ...rest
}: AdaptiveImageProps) {
  const { effectiveMode, capabilities } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();

  // Compute quality and loading strategy based on device
  const { quality, loading, shouldEager, shouldSkipBlur } = useMemo(() => {
    const isSaver = effectiveMode === "saver" || effectiveMode === "ultra-lite";
    const isLite = effectiveMode === "lite";

    if (forceLowQuality || isSaver) {
      return {
        quality: isUltraLite ? 25 : 35,
        loading: "lazy" as const,
        shouldEager: false,
        shouldSkipBlur: true,
      };
    }
    if (isLite) {
      return {
        quality: 55,
        loading: "lazy" as const,
        shouldEager: false,
        shouldSkipBlur: false,
      };
    }
    return {
      quality: 75,
      loading: priority ? ("eager" as const) : ("lazy" as const),
      shouldEager: priority,
      shouldSkipBlur: isUltraLite,
    };
  }, [effectiveMode, priority, forceLowQuality, isUltraLite]);

  // Compute smaller sizes for weak devices
  const adaptiveSizes = useMemo(() => {
    if (isUltraLite && sizes) {
      // halve the sizes for ultra-lite
      return sizes.replace(/(\d+)vw/g, (m, n) => `${Math.max(20, Math.floor(Number(n) / 2))}vw`);
    }
    return sizes;
  }, [isUltraLite, sizes]);

  const wrapperStyle = aspectRatio
    ? ({ aspectRatio, contain: "layout style paint" } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={cn("relative overflow-hidden", wrapperClassName)}
      style={wrapperStyle}
      data-adaptive-image
    >
      <Image
        {...rest}
        src={src}
        alt={alt}
        quality={quality}
        loading={priority ? "eager" : loading}
        priority={shouldEager}
        sizes={adaptiveSizes}
        placeholder={showPlaceholder && !shouldSkipBlur ? "blur" : "empty"}
        blurDataURL={
          showPlaceholder && !shouldSkipBlur
            ? blurDataURL(blurColor)
            : undefined
        }
        className={cn(className)}
      />
    </div>
  );
});

/**
 * Generates a tiny base64-encoded SVG blur placeholder.
 * Avoids the cost of generating one at runtime.
 */
function blurDataURL(color: string): string {
  // 1x1 transparent image — Next.js will use it as a base for blurDataURL
  // We keep the color simple so the blur effect is minimal in cost.
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${color}"/></svg>`
  ).toString("base64")}`;
}

/**
 * LightImg - A simple <img> wrapper that respects performance mode.
 * For cases where Next/Image is overkill.
 */
export const LightImg = React.memo(function LightImg({
  src,
  alt,
  className,
  width,
  height,
  loading,
  decoding = "async",
  fetchPriority,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  fetchPriority?: "high" | "low" | "auto";
}) {
  const { effectiveMode } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();

  // Skip the image entirely on very weak devices if it's decorative
  // (caller can pass data-decorative="true" to opt-in)
  const isDecorative = (rest as Record<string, unknown>)["data-decorative"] === "true";

  if (isDecorative && isUltraLite) {
    return null;
  }

  // Smaller sizes for weak devices
  const factor = isUltraLite ? 0.5 : effectiveMode === "saver" ? 0.6 : effectiveMode === "lite" ? 0.8 : 1;

  const adjustedWidth = typeof width === "number" ? Math.floor(width * factor) : width;
  const adjustedHeight = typeof height === "number" ? Math.floor(height * factor) : height;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={adjustedWidth}
      height={adjustedHeight}
      loading={loading ?? (effectiveMode === "performance" ? "eager" : "lazy")}
      decoding={decoding}
      // @ts-expect-error - fetchPriority not yet in React types in all versions
      fetchpriority={fetchPriority}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "300px 200px",
      }}
      {...rest}
    />
  );
});

/**
 * LazyImage - Simple image that loads only when in viewport.
 * No Next/Image dependency, no placeholder, no quality logic.
 * Best for use within lists/grids.
 */
export const LazyImage = React.memo(function LazyImage({
  src,
  alt,
  className,
  rootMargin = "200px",
  threshold = 0.01,
  fallback,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  rootMargin?: string;
  threshold?: number;
  fallback?: React.ReactNode;
}) {
  const { effectiveMode } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement | null>(null);

  // In performance mode, eager load
  useEffect(() => {
    if (effectiveMode === "performance") {
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
  }, [effectiveMode, rootMargin, threshold]);

  return (
    <img
      ref={ref}
      alt={alt}
      data-src={src}
      src={inView ? src : undefined}
      className={cn(className, !loaded && isUltraLite && "opacity-0")}
      onLoad={useCallback(() => setLoaded(true), [])}
      loading="lazy"
      decoding="async"
      style={{
        transition: loaded ? "none" : undefined,
      }}
      {...rest}
    >
      {fallback}
    </img>
  );
});
