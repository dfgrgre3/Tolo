"use client";

import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStickyHeader } from "@/hooks/use-sticky-header";

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
  value?: number;
  label?: string;
  isDaily?: boolean;
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
  value,
  label,
  isDaily = false,
}: ReadingProgressBarProps) {
  const { scrollProgress } = useStickyHeader({ enableProgress: !isDaily && value === undefined });
  
  // Use provided value, or scroll progress
  const currentProgress = value !== undefined ? value : scrollProgress;

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
      aria-label={label || (isDaily ? "تقدم الإنجاز اليومي" : "تقدم القراءة")}
    >
      {label && (
        <div className="flex justify-between items-center mb-1 px-4">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{label}</span>
          <span className="text-[10px] font-black text-primary">{displayProgress}%</span>
        </div>
      )}
      {/* Background track */}
      <div
        className="w-full bg-border/30 dark:bg-border/20"
        style={{ height: `${height}px` }}
      >
        {/* Progress bar */}
        {animate ? (
          <motion.div
            className={cn(
              "h-full origin-left relative",
              gradientClass,
              isDaily ? "shadow-[0_0_15px_rgba(168,85,247,0.5)]" : "shadow-[0_0_10px_rgba(var(--primary),0.5)]"
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: currentProgress / 100 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              mass: 0.5,
            }}
          >
            {/* Glow effect at the end of the bar */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-full bg-white/40 blur-sm rounded-full" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-[150%] bg-primary blur-[2px] rounded-full shadow-[0_0_10px_var(--primary)]" />
          </motion.div>
        ) : (
          <div
            className={cn(
              "h-full origin-left transition-transform duration-150 ease-out",
              gradientClass,
              "shadow-md shadow-primary/30 dark:shadow-primary/40"
            )}
            style={{ transform: `scaleX(${currentProgress / 100})` }}
          />
        )}
      </div>

      {/* Optional percentage indicator */}
      {showPercentage && currentProgress > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "absolute left-2 text-[10px] font-black text-primary bg-background/95 dark:bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-full shadow-lg border border-primary/20",
            position === "top" ? "top-full mt-2" : "bottom-full mb-2"
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
