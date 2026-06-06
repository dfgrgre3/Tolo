"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useEfficiency as useEfficiencyCapabilities } from "@/hooks/use-efficiency";
import { useUltraLiteMode } from "@/hooks/use-efficiency-mode";
import { cn } from "@/lib/utils";

export interface AdaptiveVideoProps
  extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src" | "preload" | "autoPlay"> {
  src: string | string[];
  /** Optional poster image (only used in performance/balanced mode) */
  poster?: string;
  /** Force a quality override */
  forceLowQuality?: boolean;
  /** Show controls */
  controls?: boolean;
  /** Wrapper class */
  wrapperClassName?: string;
  /** Optional fallback when video is disabled */
  fallback?: React.ReactNode;
  /** Aspect ratio for the wrapper */
  aspectRatio?: string;
}

/**
 * AdaptiveVideo - A <video> wrapper that adapts to device capabilities.
 *
 * On weak devices (lite/saver/ultra-lite):
 *  - Skips preload (no metadata download)
 *  - Disables autoplay
 *  - Renders a small poster/thumbnail instead of the video
 *  - Hides video element on ultra-lite (or shows a "play" link)
 *  - Reduces playback rate to save CPU
 */
export const AdaptiveVideo = React.memo(function AdaptiveVideo({
  src,
  poster,
  forceLowQuality = false,
  controls = true,
  className,
  wrapperClassName,
  fallback,
  aspectRatio,
  children,
  ...rest
}: AdaptiveVideoProps) {
  const { effectiveMode, capabilities } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();
  const [showControls, setShowControls] = useState(controls);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isSaver = effectiveMode === "saver" || effectiveMode === "ultra-lite" || forceLowQuality;
  const isLite = effectiveMode === "lite";

  // On ultra-lite + slow connection, show a poster only (no video element)
  const shouldShowPosterOnly = isUltraLite || (isSaver && (capabilities.saveData || capabilities.effectiveType === "2g" || capabilities.effectiveType === "slow-2g"));

  // Configure playback rate to reduce CPU
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isSaver) {
      v.playbackRate = Math.min(v.playbackRate, 0.85);
    } else if (isLite) {
      v.playbackRate = Math.min(v.playbackRate, 0.95);
    }
  }, [isSaver, isLite]);

  // Disable autoplay in efficiency mode
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isSaver) {
      v.autoplay = false;
      v.pause();
    }
  }, [isSaver]);

  const wrapperStyle = aspectRatio
    ? ({ aspectRatio, contain: "layout style paint" } as React.CSSProperties)
    : undefined;

  if (shouldShowPosterOnly && poster) {
    return (
      <div
        className={cn("relative overflow-hidden", wrapperClassName)}
        style={wrapperStyle}
        data-adaptive-video="poster-only"
      >
        {/* Static poster with a play icon overlay */}
        <img
          src={poster}
          alt=""
          className={cn("w-full h-full object-cover", className)}
          loading="lazy"
          decoding="async"
          style={{ filter: isUltraLite ? "none" : undefined }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="white"
              stroke="none"
            >
              <polygon points="6 4 20 12 6 20" />
            </svg>
          </div>
        </div>
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden", wrapperClassName)}
      style={wrapperStyle}
      data-adaptive-video
    >
      <video
        ref={videoRef}
        src={typeof src === "string" ? src : undefined}
        // @ts-expect-error - sources not a standard prop on video element
        sources={typeof src === "object" ? src.map((s) => ({ src: s })) : undefined}
        poster={poster}
        controls={showControls}
        preload={isSaver ? "none" : isLite ? "metadata" : "auto"}
        autoPlay={false}
        muted
        playsInline
        className={cn("w-full h-full", className)}
        {...rest}
      >
        {typeof src === "object" &&
          src.map((s, i) => <source key={i} src={s} />)}
        {children}
        {fallback}
      </video>
    </div>
  );
});

/**
 * LazyVideo - A video that only starts loading when in viewport.
 * Useful for videos embedded in long pages.
 */
export const LazyVideo = React.memo(function LazyVideo({
  src,
  poster,
  className,
  rootMargin = "200px",
  ...rest
}: AdaptiveVideoProps & { rootMargin?: string }) {
  const { effectiveMode } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [effectiveMode, rootMargin]);

  return (
    <div ref={ref} data-adaptive-video-lazy>
      {inView ? (
        <AdaptiveVideo
          src={src}
          poster={poster}
          className={className}
          {...rest}
        />
      ) : poster ? (
        <img
          src={poster}
          alt=""
          className={cn("w-full h-full object-cover", className)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className={cn("bg-muted flex items-center justify-center", className)}
          style={{ minHeight: "200px" }}
        />
      )}
    </div>
  );
});

/**
 * ThumbnailPlay - A clickable thumbnail that opens a video in a lightweight overlay
 * or directly plays inline. Best for very weak devices where the video tag
 * is too expensive.
 */
export const ThumbnailPlay = React.memo(function ThumbnailPlay({
  src,
  poster,
  title,
  className,
  onPlay,
}: {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  onPlay?: () => void;
}) {
  const { effectiveMode } = useEfficiencyCapabilities();
  const isUltraLite = useUltraLiteMode();
  const [playing, setPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    if (isUltraLite && onPlay) {
      // On ultra-lite, defer to external player (lighter)
      onPlay();
    } else {
      setPlaying(true);
    }
  }, [isUltraLite, onPlay]);

  if (playing && !isUltraLite) {
    return (
      <AdaptiveVideo
        src={src}
        poster={poster}
        controls
        autoFocus
        aspectRatio="16/9"
        className={className}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      className={cn(
        "relative w-full overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary",
        className
      )}
      aria-label={title ? `تشغيل ${title}` : "تشغيل الفيديو"}
      style={{ contain: "layout style paint" }}
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          style={{ filter: isUltraLite ? "none" : undefined }}
        />
      ) : (
        <div className="bg-muted w-full h-full" style={{ minHeight: "200px" }} />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="black"
            stroke="none"
          >
            <polygon points="6 4 20 12 6 20" />
          </svg>
        </div>
      </div>
    </button>
  );
});
