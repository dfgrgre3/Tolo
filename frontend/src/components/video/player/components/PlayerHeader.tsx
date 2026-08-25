import { Check, Sparkles, SunMedium, Youtube, Zap } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { providerLabelMap } from "../constants";
import { usePlaybackStore } from "../stores/playback-store";
import { useSettingsStore } from "../stores/settings-store";
import { useUIStore } from "../stores/ui-store";
import type { BookmarkItem, VideoProvider } from "../types";
import { cn } from "@/lib/utils";

export function PlayerHeader({
  provider,
  lessonTitle,
  alreadyCompleted,
  markers,
  onMarkComplete,
}: {
  provider: VideoProvider;
  lessonTitle: string;
  alreadyCompleted: boolean;
  markers: BookmarkItem[];
  onMarkComplete: () => void;
}) {
  const { currentTime, duration, playbackRate } = usePlaybackStore(
    useShallow((state) => ({
      currentTime: state.currentTime,
      duration: state.duration,
      playbackRate: state.playbackRate,
    }))
  );

  const { brightness } = useSettingsStore(
    useShallow((state) => ({
      brightness: state.brightness,
    }))
  );

  const { showControls } = useUIStore(
    useShallow((state) => ({
      showControls: state.showControls,
    }))
  );

  const progressPercent =
    duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
  const completionReady = progressPercent >= 90 || alreadyCompleted;
  const currentMarker = useMemo(() => {
    if (markers.length === 0) return null;

    return (
      [...markers]
        .reverse()
        .find((marker) => {
          if (marker.endTime && marker.endTime > marker.time) {
            return currentTime >= marker.time && currentTime <= marker.endTime;
          }

          return currentTime >= marker.time;
        }) ?? null
    );
  }, [currentTime, markers]);

  // Mobile: smaller badges, centered layout
  return (
    <div className={cn(
      "pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/95 via-black/60 to-transparent px-6 pb-28 pt-6 transition-opacity duration-300",
      showControls ? "opacity-100" : "opacity-0"
    )}>
      <div className="flex items-start justify-between gap-8">
        <div className="flex-1 space-y-5 sm:w-auto">
          {/* Mobile-optimized badges row */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:flex-nowrap sm:justify-start sm:gap-4">
            <span className={cn(
              "inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-gradient-to-r from-white/15 to-white/10 px-5 py-2.5 text-xs font-bold text-white/95 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all hover:scale-105",
              "sm:px-4 sm:py-2 sm:text-[11px]"
            )}>
              {provider === "youtube" ? (
                <Youtube className="h-4 w-4 text-red-400" />
              ) : (
                <Sparkles className="h-4 w-4 text-sky-300" />
              )}
              {providerLabelMap[provider]}
            </span>

            {playbackRate !== 1 && (
              <span className={cn(
                "inline-flex items-center gap-2.5 rounded-full border border-sky-400/30 bg-gradient-to-r from-sky-500/15 to-sky-500/5 px-5 py-2.5 text-xs font-bold text-sky-100 shadow-[0_0_15px_rgba(14,165,233,0.2)] transition-all hover:scale-105",
                "sm:px-4 sm:py-2 sm:text-[11px]"
              )}>
                <Zap className="h-4 w-4" />
                سرعة {playbackRate}x
              </span>
            )}

            {completionReady && (
              <span className={cn(
                "inline-flex items-center gap-2.5 rounded-full border border-emerald-400/20 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 px-5 py-2.5 text-xs font-bold text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all hover:scale-105",
                "sm:px-4 sm:py-2 sm:text-[11px]"
              )}>
                <Check className="h-4 w-4" />
                مكتمل
              </span>
            )}

            {brightness !== 1 && (
              <span className={cn(
                "inline-flex items-center gap-2.5 rounded-full border border-amber-400/20 bg-gradient-to-r from-amber-500/15 to-amber-500/5 px-5 py-2.5 text-xs font-bold text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all hover:scale-105",
                "sm:px-4 sm:py-2 sm:text-[11px]"
              )}>
                <SunMedium className="h-4 w-4" />
                {Math.round(brightness * 100)}% سطوع
              </span>
            )}
          </div>

          {/* Title - centered on mobile */}
          <div className="text-center sm:text-right">
            <h3 className={cn(
              "line-clamp-2 text-lg font-black text-white sm:text-xl bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent drop-shadow-lg"
            )}>
              {lessonTitle}
            </h3>
            {/* Mobile: Show current marker more prominently */}
            {currentMarker ? (
              <p className={cn(
                "mt-4 inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/15 bg-gradient-to-r from-black/30 to-black/20 px-5 py-2.5 text-xs font-bold text-white/90 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all hover:scale-105",
                "sm:mt-3 sm:px-4 sm:py-2 sm:text-[11px]"
              )}>
                <Sparkles className="h-4 w-4 text-amber-300" />
                الآن: {currentMarker.label}
              </p>
            ) : null}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-4">
          {!alreadyCompleted ? (
            <button
              type="button"
              onClick={onMarkComplete}
              className={cn(
                "rounded-full border border-emerald-400/30 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 px-6 py-3 text-sm font-bold text-emerald-200 transition-all duration-300 hover:from-emerald-500/20 hover:to-emerald-500/10 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95",
                "sm:px-5 sm:py-2.5"
              )}
            >
              تحديد كمكتمل
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}