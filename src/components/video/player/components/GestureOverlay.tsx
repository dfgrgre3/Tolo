"use client";

import { memo } from "react";
import { Volume2, SunMedium, FastForward, Rewind, Zap } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type GestureOverlayProps = {
  mode: "volume" | "brightness" | "seek" | "speed" | null;
  value: number | string;
  visible: boolean;
};

export const GestureOverlay = memo(({ mode, value, visible }: GestureOverlayProps) => {
  if (!mode || !visible) return null;

  const getIcon = () => {
    switch (mode) {
      case "volume": return Volume2;
      case "brightness": return SunMedium;
      case "speed": return Zap;
      case "seek": return Number(value) > 0 ? FastForward : Rewind;
      default: return Volume2;
    }
  };

  const Icon = getIcon();
  const percentage = typeof value === "number" ? Math.round(value * 100) : null;
  const seekValue = typeof value === "string" ? value : null;

  const modeColors = {
    volume: { ring: "border-blue-400/50", bg: "bg-blue-500/10", text: "text-blue-400" },
    brightness: { ring: "border-amber-400/50", bg: "bg-amber-500/10", text: "text-amber-400" },
    speed: { ring: "border-orange-400/50", bg: "bg-orange-500/20", text: "text-orange-400" },
    seek: { ring: "border-cyan-400/50", bg: "bg-cyan-500/10", text: "text-cyan-400" },
  };

  const colors = mode ? modeColors[mode] : modeColors.volume;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="pointer-events-none absolute inset-0 z-[100] flex items-center justify-center"
      >
        {/* Ripple effect for seek */}
        {mode === "seek" && (
          <m.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "absolute h-24 w-24 rounded-full",
              Number(value) > 0 ? "bg-cyan-400/20 right-1/4" : "bg-cyan-400/20 left-1/4"
            )}
          />
        )}

        <div className={cn(
          "flex min-h-[140px] min-w-[140px] flex-col items-center justify-center rounded-[36px] border-2 bg-black/60 p-6 backdrop-blur-xl transition-all duration-300",
          colors.ring,
          visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        )}>
          {/* Circular progress for volume/brightness */}
          {(mode === "volume" || mode === "brightness") && percentage !== null && (
            <div className="relative mb-3 h-20 w-20">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="34"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  className="text-white/10"
                />
                <circle
                  cx="40" cy="40" r="34"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  className={cn("transition-all duration-100", colors.text)}
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - percentage / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-white">
                  {percentage}
                </span>
              </div>
            </div>
          )}

          {/* Speed mode display */}
          {mode === "speed" && (
            <div className="mb-3 flex items-center justify-center">
              <m.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="rounded-2xl bg-orange-500 p-4 text-white shadow-lg shadow-orange-500/30"
              >
                <Icon className="h-8 w-8" />
              </m.div>
            </div>
          )}

          {/* Seek arrows display */}
          {mode === "seek" && (
            <div className="mb-3 flex items-center gap-1">
              {Number(value) > 0 ? (
                <>
                  <FastForward className="h-6 w-6 text-cyan-400 animate-pulse" />
                  <FastForward className="h-6 w-6 text-cyan-400/60 animate-pulse" style={{ animationDelay: "0.1s" }} />
                </>
              ) : (
                <>
                  <Rewind className="h-6 w-6 text-cyan-400/60 animate-pulse" style={{ animationDelay: "0.1s" }} />
                  <Rewind className="h-6 w-6 text-cyan-400 animate-pulse" />
                </>
              )}
            </div>
          )}

          {/* Icon for volume/brightness only */}
          {(mode === "volume" || mode === "brightness") && (
            <div className={cn("rounded-2xl p-2", colors.bg)}>
              <Icon className={cn("h-5 w-5", colors.text)} />
            </div>
          )}

          <div className="mt-2 text-center">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {mode === "volume" ? "الصوت" : mode === "brightness" ? "السطوع" : mode === "speed" ? "السرعة" : "انتقال"}
            </span>
            <span className={cn("text-2xl font-black", mode === "seek" ? "text-cyan-400" : "text-white")}>
              {mode === "speed" ? `${value}x` : mode === "seek" ? `${seekValue}ث` : `${percentage}%`}
            </span>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
});

GestureOverlay.displayName = "GestureOverlay";
