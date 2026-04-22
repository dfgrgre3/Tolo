import { Check, Clock3, Sparkles, SunMedium, Youtube } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { providerLabelMap } from "../constants";
import { useCourseVideoPlayerStore } from "../store";
import type { VideoProvider } from "../types";

export function PlayerHeader({
  provider,
  lessonTitle,
  alreadyCompleted,
  onMarkComplete,
}: {
  provider: VideoProvider;
  lessonTitle: string;
  alreadyCompleted: boolean;
  onMarkComplete: () => void;
}) {
  const { currentTime, duration, brightness } = useCourseVideoPlayerStore(
    useShallow((state) => ({
      currentTime: state.currentTime,
      duration: state.duration,
      brightness: state.brightness,
    }))
  );

  const progressPercent =
    duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
  const completionReady = progressPercent >= 90 || alreadyCompleted;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-4 pb-16 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/85 backdrop-blur-md">
              {provider === "youtube" ? (
                <Youtube className="h-3.5 w-3.5 text-red-400" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-sky-300" />
              )}
              {providerLabelMap[provider]}
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-200">
              <Clock3 className="h-3.5 w-3.5" />
              {progressPercent}% مشاهدة
            </span>

            {completionReady ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-200">
                <Check className="h-3.5 w-3.5" />
                مكتمل
              </span>
            ) : null}

            {brightness !== 1 ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/15 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-100">
                <SunMedium className="h-3.5 w-3.5" />
                {Math.round(brightness * 100)}% سطوع
              </span>
            ) : null}
          </div>

          <div>
            <h3 className="text-lg font-black text-white sm:text-xl">{lessonTitle}</h3>
            <p className="text-xs text-white/60 sm:text-sm">
              مشغل تعليمي احترافي مع مزامنة تقدم ولمس متقدم ودمج YouTube حقيقي.
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {!alreadyCompleted ? (
            <button
              type="button"
              onClick={onMarkComplete}
              className="hidden rounded-full border border-emerald-400/20 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20 sm:inline-flex"
            >
              تحديد كمكتمل
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
