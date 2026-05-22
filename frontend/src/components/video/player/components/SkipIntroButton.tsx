"use client";

import { memo } from "react";
import { SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookmarkItem } from "../types";

type SkipIntroButtonProps = {
  currentTime: number;
  markers: BookmarkItem[];
  onSkip: (time: number) => void;
};

export const SkipIntroButton = memo(({ currentTime, markers, onSkip }: SkipIntroButtonProps) => {
  const activeMarker = markers.find(m => {
    const label = m.label.toLowerCase();
    const isIntro = label.includes("intro") || label.includes("مقدمة") || label.includes("recap") || label.includes("ملخص");
    return isIntro && m.endTime && currentTime >= m.time && currentTime < m.endTime - 1;
  });

  if (!activeMarker || !activeMarker.endTime) return null;

  return (
    <button
      onClick={() => onSkip(activeMarker.endTime!)}
      className={cn(
        "absolute bottom-28 left-8 z-[60] flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-5 py-3 font-bold text-white backdrop-blur-xl transition-all hover:bg-black/80 active:scale-95 animate-in fade-in slide-in-from-left-4 duration-500"
      )}
    >
      <SkipForward className="h-5 w-5" />
      <span>تخطي {activeMarker.label}</span>
    </button>
  );
});

SkipIntroButton.displayName = "SkipIntroButton";
