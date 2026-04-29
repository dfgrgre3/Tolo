import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { AnimatePresence, m } from "framer-motion";
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
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [previewPercent, setPreviewPercent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const safeProgressPercent = clamp(progressPercent, 0, 100);
  const safeBufferedPercent = clamp(bufferedPercent, 0, 100);

  // Pseudo-random heatmap data for engagement visualization
  const heatmapData = useMemo(() => {
    if (duration <= 0) return [];
    const points = 40;
    const data = [];
    for (let i = 0; i < points; i++) {
      // Create some "hot" zones
      const base = Math.sin(i / 2) * 15 + 20;
      const noise = Math.random() * 10;
      data.push(Math.max(5, base + noise));
    }
    return data;
  }, [duration]);

  const activeCue =
    previewTime !== null ? getThumbnailCueAtTime(thumbnails, previewTime) : null;
  const activeMarker = useMemo(() => {
    if (previewTime === null) return null;

    return (
      markers.find((marker) => {
        if (marker.endTime && marker.endTime > marker.time) {
          return previewTime >= marker.time && previewTime <= marker.endTime;
        }

        return Math.abs(marker.time - previewTime) <= 4;
      }) ?? null
    );
  }, [markers, previewTime]);

  const updatePreview = useCallback(
    (clientX: number) => {
      if (!railRef.current || duration <= 0) return null;
      const rect = railRef.current.getBoundingClientRect();
      const percent = clamp((clientX - rect.left) / rect.width, 0, 1);
      const nextPreviewTime = percent * duration;
      setPreviewPercent(percent * 100);
      setPreviewTime(nextPreviewTime);
      return nextPreviewTime;
    },
    [duration]
  );

  const commitSeek = useCallback(
    (nextTime: number | null) => {
      if (nextTime === null) return;
      onSeek(nextTime);
    },
    [onSeek]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (duration <= 0) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      commitSeek(updatePreview(event.clientX));
    },
    [commitSeek, duration, updatePreview]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (duration <= 0) return;

      if (isDragging) {
        event.preventDefault();
        commitSeek(updatePreview(event.clientX));
        return;
      }

      updatePreview(event.clientX);
    },
    [commitSeek, duration, isDragging, updatePreview]
  );

  const handlePointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (isDragging) {
        commitSeek(updatePreview(event.clientX));
      }

      setIsDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [commitSeek, isDragging, updatePreview]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (duration <= 0) return;

      const baseStep = duration > 600 ? 10 : 5;

      switch (event.key) {
        case "ArrowLeft":
        case "ArrowDown":
          event.preventDefault();
          onSeek(clamp(currentTime - baseStep, 0, duration));
          break;
        case "ArrowRight":
        case "ArrowUp":
          event.preventDefault();
          onSeek(clamp(currentTime + baseStep, 0, duration));
          break;
        case "Home":
          event.preventDefault();
          onSeek(0);
          break;
        case "End":
          event.preventDefault();
          onSeek(duration);
          break;
        case "PageDown":
          event.preventDefault();
          onSeek(clamp(currentTime - 30, 0, duration));
          break;
        case "PageUp":
          event.preventDefault();
          onSeek(clamp(currentTime + 30, 0, duration));
          break;
        default:
          break;
      }
    },
    [currentTime, duration, onSeek]
  );

  useEffect(() => {
    if (!isDragging) return;

    setPreviewTime(currentTime);
    setPreviewPercent(safeProgressPercent);
  }, [currentTime, isDragging, safeProgressPercent]);

  return (
    <div className="space-y-2">
      <div
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-label="شريط تقدم الفيديو"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatDuration(currentTime)} من ${formatDuration(duration)}`}
        className="group/progress relative cursor-pointer py-2 outline-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onMouseLeave={() => {
          if (!isDragging) {
            setPreviewTime(null);
          }
        }}
        onBlur={() => {
          if (!isDragging) {
            setPreviewTime(null);
          }
        }}
        onFocus={() => {
          setPreviewTime(currentTime);
          setPreviewPercent(safeProgressPercent);
        }}
        onKeyDown={handleKeyDown}
      >
        <AnimatePresence>
          {previewTime !== null ? (
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-none absolute bottom-8 z-20 -translate-x-1/2"
              style={{ left: `${previewPercent}%` }}
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
                    {formatDuration(previewTime)}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-[11px] font-bold text-white shadow-xl">
                  {formatDuration(previewTime)}
                </div>
              )}

              {activeMarker ? (
                <div className="mt-2 max-w-[180px] rounded-lg border border-white/10 bg-slate-950/90 px-2 py-1 text-center text-[11px] font-bold text-white/80 shadow-xl">
                  {activeMarker.label}
                </div>
              ) : null}
            </m.div>
          ) : null}
        </AnimatePresence>

        {/* Engagement Heatmap */}
        <div className="absolute inset-x-0 -top-4 bottom-2 pointer-events-none opacity-0 group-hover/progress:opacity-40 group-focus-within/progress:opacity-40 transition-opacity duration-300">
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox={`0 0 ${heatmapData.length} 50`}>
            <path
              d={`M 0 50 ${heatmapData.map((h, i) => `L ${i} ${50 - h}`).join(" ")} L ${heatmapData.length} 50 Z`}
              fill="url(#heatmapGradient)"
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="heatmapGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative h-2.5 overflow-hidden rounded-full bg-white/15 transition-all duration-200 group-hover/progress:h-3.5 group-focus-within/progress:h-3.5">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/15"
            style={{ width: `${safeBufferedPercent}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
            style={{ width: `${safeProgressPercent}%` }}
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
            style={{ left: `${safeProgressPercent}%` }}
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
