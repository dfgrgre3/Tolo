import { memo, useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BookmarkItem, ThumbnailCue } from "../types";
import {
  clamp,
  formatDuration,
  getThumbnailCueAtTime,
} from "../utils";

export const ProgressRail = memo(function ProgressRail({
  currentTime,
  duration,
  buffered,
  markers,
  thumbnails,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  buffered: number;
  markers: BookmarkItem[];
  thumbnails: ThumbnailCue[];
  onSeek: (value: number) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState(0);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const activeCue = hoverTime !== null ? getThumbnailCueAtTime(thumbnails, hoverTime) : null;

  const updateHover = useCallback(
    (clientX: number) => {
      if (!railRef.current || duration <= 0) return null;
      const rect = railRef.current.getBoundingClientRect();
      const percent = clamp((clientX - rect.left) / rect.width, 0, 1);
      const nextHoverTime = percent * duration;
      setHoverPercent(percent * 100);
      setHoverTime(nextHoverTime);
      return nextHoverTime;
    },
    [duration]
  );

  return (
    <div className="space-y-2">
      <div
        ref={railRef}
        className="group/progress relative cursor-pointer py-2"
        onMouseMove={(event) => updateHover(event.clientX)}
        onMouseLeave={() => setHoverTime(null)}
        onClick={(event) => {
          const nextHoverTime = updateHover(event.clientX);
          if (nextHoverTime !== null) {
            onSeek(nextHoverTime);
          }
        }}
      >
        <AnimatePresence>
          {hoverTime !== null ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-none absolute bottom-8 z-20 -translate-x-1/2"
              style={{ left: `${hoverPercent}%` }}
            >
              {activeCue ? (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/95 p-1 shadow-2xl">
                  <div
                    className="h-[72px] w-[128px] rounded-lg bg-cover bg-no-repeat"
                    style={{
                      backgroundImage: `url(${activeCue.imageUrl})`,
                      backgroundPosition: `-${activeCue.x}px -${activeCue.y}px`,
                      backgroundSize:
                        activeCue.width > 0 && activeCue.height > 0
                          ? "auto"
                          : "cover",
                    }}
                  />
                  <div className="px-1 pb-1 pt-2 text-center text-[11px] font-bold text-white">
                    {formatDuration(hoverTime)}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] font-bold text-white shadow-xl">
                  {formatDuration(hoverTime)}
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="relative h-2.5 overflow-hidden rounded-full bg-white/15 transition-all duration-200 group-hover/progress:h-3.5">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/15"
            style={{ width: `${bufferedPercent}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />

          {markers.map((marker) => {
            const left = duration > 0 ? (marker.time / duration) * 100 : 0;
            const width =
              duration > 0 && marker.endTime && marker.endTime > marker.time
                ? ((marker.endTime - marker.time) / duration) * 100
                : null;

            return width ? (
              <div
                key={`${marker.time}-${marker.label}-segment`}
                className="absolute inset-y-0 rounded-full bg-amber-300/20"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={marker.label}
              />
            ) : (
              <div
                key={`${marker.time}-${marker.label}`}
                className="absolute top-1/2 z-10 h-5 w-[3px] -translate-y-1/2 rounded-full bg-amber-300/90 shadow-[0_0_10px_rgba(251,191,36,0.7)]"
                style={{ left: `${left}%` }}
                title={marker.label}
              />
            );
          })}

          <div
            className="absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.7)]"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[12px] font-bold tabular-nums text-white/65">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
});
