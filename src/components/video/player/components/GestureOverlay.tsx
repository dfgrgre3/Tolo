"use client";

import { memo } from "react";
import { Volume2, SunMedium } from "lucide-react";
import { cn } from "@/lib/utils";

type GestureOverlayProps = {
  mode: "volume" | "brightness" | null;
  value: number; // 0 to 1
  visible: boolean;
};

export const GestureOverlay = memo(({ mode, value, visible }: GestureOverlayProps) => {
  if (!mode || !visible) return null;

  const Icon = mode === "volume" ? Volume2 : SunMedium;
  const percentage = Math.round(value * 100);

  return (
    <div className="pointer-events-none absolute inset-0 z-[100] flex items-center justify-center">
      <div className={cn(
        "flex h-48 w-20 flex-col items-center justify-between rounded-3xl bg-black/60 p-4 backdrop-blur-xl transition-all duration-300",
        visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
      )}>
        {/* Progress Bar Container */}
        <div className="relative flex-1 w-2 rounded-full bg-white/20 overflow-hidden">
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-100"
            style={{ height: `${percentage}%` }}
          />
        </div>
        
        {/* Icon & Label */}
        <div className="mt-4 flex flex-col items-center gap-1">
          <Icon className="h-6 w-6 text-white" />
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
            {mode === "volume" ? "الصوت" : "السطوع"}
          </span>
          <span className="text-sm font-black text-white">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
});

GestureOverlay.displayName = "GestureOverlay";
