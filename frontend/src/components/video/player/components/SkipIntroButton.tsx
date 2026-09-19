"use client";

import { memo, useEffect, useRef } from "react";
import { SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookmarkItem } from "../types";
import { usePlayerPlayback, usePlayerSettings } from "../stores/player-scope";

type SkipIntroButtonProps = {
  markers: BookmarkItem[];
  onSkip: (time: number) => void;
};

export const SkipIntroButton = memo(({ markers, onSkip }: SkipIntroButtonProps) => {
  const currentTime = usePlayerPlayback((state) => state.currentTime);
  // P2-43: auto-skip preference — jumps once per marker when entering range.
  const skipIntro = usePlayerSettings((state) => state.skipIntro);
  const autoSkippedRef = useRef<Set<string>>(new Set());

  const activeMarker = markers.find(m => {
    const label = m.label.toLowerCase();
    // P3-50: skippable segments — intros, recaps, sponsor/ad reads.
    // Latin ad-tokens use word boundaries ("ad" must not match "read");
    // "section"/"قسم" deliberately excluded (false-positives on chapters).
    const isIntro = label.includes("intro") || label.includes("مقدمة")
      || label.includes("recap") || label.includes("ملخص")
      || label.includes("إعلان")
      || /\b(ads?|sponsor)\b/.test(label);
    return isIntro && m.endTime && currentTime >= m.time && currentTime < m.endTime - 1;
  });

  useEffect(() => {
    if (!skipIntro || !activeMarker?.endTime) return;
    const key = `${activeMarker.time}-${activeMarker.label}`;
    if (autoSkippedRef.current.has(key)) return;
    autoSkippedRef.current.add(key);
    onSkip(activeMarker.endTime);
  }, [skipIntro, activeMarker, onSkip]);

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
