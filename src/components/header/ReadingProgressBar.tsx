"use client";

import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStickyHeader } from "./hooks/useStickyHeader";

interface ReadingProgressBarProps {
  className?: string;
  position?: "top" | "bottom";
  height?: number;
  showPercentage?: boolean;
  gradientColors?: {
    from: string;
    via?: string;
    to: string;
  };
  animate?: boolean;
}

export const ReadingProgressBar = memo(function ReadingProgressBar({
  className,
  position = "top",
  height = 3,
  showPercentage = false,
  gradientColors = {
    from: "from-primary",
    via: "via-primary/85",
    to: "to-primary/70 dark:to-primary/60",
  },
  animate = true,
}: ReadingProgressBarProps) {
  const { scrollProgress } = useStickyHeader({ enableProgress: true });

  // Memoize gradient class
  const gradientClass = useMemo(() => {
    const { from, via, to } = gradientColors;
    return via
      ? `bg-gradient-to-r ${from} ${via} ${to}`
      : `bg-gradient-to-r ${from} ${to}`;
  }, [gradientColors]);

  // Position styles
  const positionStyles = useMemo(
    () => ({
      top: "top-0",
      bottom: "bottom-0",
    }),
    []
  );

  // Round progress for display
  const displayProgress = Math.round(scrollProgress);

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[100] pointer-events-none",
        positionStyles[position],
        className
      )}
      role="progressbar"
      aria-valuenow={displayProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="تقدم القراءة"
    >
      {/* Background track */}
      <div
        className="w-full bg-border/30 dark:bg-border/20"
        style={{ height: `${height}px` }}
      >
        {/* Progress bar */}
        {animate ? (
          <motion.div
            className={cn(
              "h-full origin-left",
              gradientClass,
              "shadow-md shadow-primary/30 dark:shadow-primary/40"
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: scrollProgress / 100 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              mass: 0.5,
            }}
          />
        ) : (
          <div
            className={cn(
              "h-full origin-left transition-transform duration-150 ease-out",
              gradientClass,
              "shadow-md shadow-primary/30 dark:shadow-primary/40"
            )}
            style={{ transform: `scaleX(${scrollProgress / 100})` }}
          />
        )}
      </div>

      {/* Optional percentage indicator */}
      {showPercentage && scrollProgress > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "absolute left-2 text-xs font-medium text-primary bg-background/95 dark:bg-background/90 backdrop-blur-md px-1.5 py-0.5 rounded shadow-md dark:shadow-lg",
            position === "top" ? "top-full mt-1" : "bottom-full mb-1"
          )}
        >
          {displayProgress}%
        </motion.div>
      )}
    </div>
  );
});

// Alternative minimal progress indicator
export const MinimalProgressIndicator = memo(function MinimalProgressIndicator({
  className,
}: {
  className?: string;
}) {
  const { scrollProgress } = useStickyHeader({ enableProgress: true });
  const displayProgress = Math.round(scrollProgress);

  if (displayProgress === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium",
        className
      )}
    >
      {/* Circular progress */}
      <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.2"
        />
        <motion.circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={50.265}
          initial={{ strokeDashoffset: 50.265 }}
          animate={{
            strokeDashoffset: 50.265 - (scrollProgress / 100) * 50.265,
          }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
          }}
        />
      </svg>
      <span>{displayProgress}%</span>
    </motion.div>
  );
});

export default ReadingProgressBar;
