"use client";

import { memo } from "react";
import { Volume2, SunMedium, FastForward, Rewind, Zap } from "lucide-react";
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

  return (
    <div className="pointer-events-none absolute inset-0 z-[100] flex items-center justify-center">
      <div className={cn(
        "flex min-h-[120px] min-w-[120px] flex-col items-center justify-center rounded-[32px] bg-black/60 p-6 backdrop-blur-xl transition-all duration-300",
        visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
      )}>
        {/* Progress Bar for continuous adjustments */}
        {(mode === "volume" || mode === "brightness") && percentage !== null && (
          <div className="relative mb-4 h-32 w-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-100"
              style={{ height: `${percentage}%` }}
            />
          </div>
        )}

        {/* Icon & Value Display */}
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "rounded-2xl p-3",
            mode === "speed" ? "bg-orange-500 text-white" : "bg-white/10 text-white"
          )}>
            <Icon className="h-8 w-8" />
          </div>
          <div className="text-center">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {mode === "volume" ? "الصوت" : mode === "brightness" ? "السطوع" : mode === "speed" ? "السرعة" : "انتقال"}
            </span>
            <span className="text-2xl font-black text-white">
              {mode === "speed" ? `${value}x` : mode === "seek" ? `${value}ث` : `${percentage}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

GestureOverlay.displayName = "GestureOverlay";
