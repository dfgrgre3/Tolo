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
import type { BookmarkItem, ThumbnailCue, TimelineNote, InteractiveQuestion } from "../types";
import {
  clamp,
  formatDuration,
} from "../utils";
import { usePlaybackStore } from "../stores/playback-store";
import { cn } from "@/lib/utils";

// Double-tap for speed control (mobile-focused)
const DOUBLE_TAP_THRESHOLD_MS = 300;

export const ProgressRail = memo(function ProgressRail({
  duration,
  buffered,
  markers,
  notes = [],
  interactiveQuestions = [],
  onSeek,
}: {
  duration: number;
  buffered: number;
  markers: BookmarkItem[];
  thumbnails: ThumbnailCue[];
  notes?: TimelineNote[];
  interactiveQuestions?: InteractiveQuestion[];
  onSeek: (value: number) => void;
}) {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const railRef = useRef<HTMLDivElement>(null);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [previewPercent, setPreviewPercent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Mobile-specific: double tap hint
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const [showDoubleTapHint, setShowDoubleTapHint] = useState(false);

  const loopStart = usePlaybackStore((s) => s.loopStart);
  const loopEnd = usePlaybackStore((s) => s.loopEnd);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const safeProgressPercent = clamp(progressPercent, 0, 100);
  const safeBufferedPercent = clamp(bufferedPercent, 0, 100);

  // Chapters are markers with a labeled end range (segments). Sorted so we
  // can find "the chapter currently playing" and its neighbours' boundaries.
  const chapters = useMemo(
    () => markers.filter((m) => m.endTime && m.endTime > m.time).sort((a, b) => a.time - b.time),
    [markers]
  );

  const activeChapter = useMemo(() => {
    if (chapters.length === 0) return null;
    return chapters.find((c) => currentTime >= c.time && currentTime < (c.endTime ?? duration)) ?? null;
  }, [chapters, currentTime, duration]);

  // Loop region visualization
  const loopRegion = useMemo(() => {
    if (loopStart === null || duration <= 0) return null;
    const startPercent = (loopStart / duration) * 100;
    if (loopEnd === null) return { start: startPercent, width: 0, pending: true };
    const endPercent = (loopEnd / duration) * 100;
    return { start: startPercent, width: endPercent - startPercent, pending: false };
  }, [loopStart, loopEnd, duration]);

  // Mobile-friendly preview - larger touch area
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

  // Mobile double-tap detection for speed boost hint
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!railRef.current) return;
      const x = e.touches[0]?.clientX ?? 0;
      
      if (lastTapRef.current) {
        const timeDiff = Date.now() - lastTapRef.current.time;
        const xDiff = Math.abs(x - lastTapRef.current.x);
        
        // Double tap detected - show hint
        if (timeDiff < DOUBLE_TAP_THRESHOLD_MS && xDiff < 50) {
          setShowDoubleTapHint(true);
          setTimeout(() => setShowDoubleTapHint(false), 1500);
        }
      }
      
      lastTapRef.current = { time: Date.now(), x };
    };

    const rail = railRef.current;
    rail?.addEventListener('touchstart', handleTouchStart);
    
    return () => rail?.removeEventListener('touchstart', handleTouchStart);
  }, []);

  // Mobile-friendly marker height
  const markerHeight = useMemo(() => 
    isDragging ? "h-5" : "h-3", 
  [isDragging]);

  // Mobile-friendly preview position (higher to avoid thumb obstruction)
  const previewPositionClass = previewPercent > 85 ? "bottom-12" : "bottom-10";

  return (
    <div className="space-y-4">
      {/* Current chapter label — stays visible above the rail (Netflix/YouTube style),
          not just on hover, so viewers always know which segment they're in. */}
      {activeChapter && (
        <div className="flex items-center gap-2 px-1">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="truncate text-[12px] font-bold text-white/70">{activeChapter.label}</span>
        </div>
      )}

      <div
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-label="شريط تقدم الفيديو"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatDuration(currentTime)} من ${formatDuration(duration)}`}
        className={cn(
          "group/progress relative cursor-pointer py-5 outline-none sm:py-3", // Increased touch area on mobile
          "touch-pan-y" // Better touch handling
        )}
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
        {/* Double-tap hint for mobile users */}
        {showDoubleTapHint && (
          <m.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-full bg-blue-500/20 px-4 py-1.5 text-[11px] font-bold text-blue-200 backdrop-blur-md sm:hidden"
          >
            انقر مرتين لتسريع التشغيل
          </m.div>
        )}

        <AnimatePresence>
          {previewTime !== null && !isDragging ? (
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={cn(
                "pointer-events-none absolute z-20 -translate-x-1/2",
                previewPositionClass
              )}
              style={{ left: `${previewPercent}%` }}
            >
              <div className="rounded-xl border border-white/10 bg-black/90 px-3 py-1.5 text-[12px] font-bold text-white shadow-xl sm:px-2 sm:py-1 sm:text-[11px]">
                {formatDuration(previewTime ?? 0)}
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>

        {/* Progress Rail - thicker on mobile */}
        <div className="relative h-3 overflow-hidden rounded-full bg-white/20 transition-all duration-300 group-hover/progress:h-4 group-focus-within/progress:h-4 sm:h-2 sm:group-hover/progress:h-2.5 sm:group-focus-within/progress:h-2.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/10 to-white/5 transition-all duration-300"
            style={{ width: `${safeBufferedPercent}%` }}
          />

          {/* A-B Loop Region */}
          {loopRegion && !loopRegion.pending && (
            <div
              className={cn(
                "absolute inset-y-0 rounded-full bg-gradient-to-r from-violet-400/30 to-purple-400/30 border-x-2 border-violet-400/60 shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all duration-300",
                isDragging ? "h-full" : "h-3"
              )}
              style={{ left: `${loopRegion.start}%`, width: `${loopRegion.width}%` }}
            />
          )}
          
          {/* Loop start marker (pending) - larger on mobile */}
          {loopRegion?.pending && (
            <div
              className={cn(
                "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 animate-pulse shadow-[0_0_20px_rgba(139,92,246,0.6)] ring-2 ring-violet-400/50 transition-all duration-300",
                isDragging ? "h-7 w-1.5" : "h-5 w-1"
              )}
              style={{ left: `${loopRegion.start}%` }}
            />
          )}

          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300"
            style={{ width: `${safeProgressPercent}%` }}
          />

          {/* Chapter / Bookmark Markers - larger touch targets on mobile */}
          {markers.map((marker) => {
            const left = duration > 0 ? (marker.time / duration) * 100 : 0;
            const width =
              duration > 0 && marker.endTime && marker.endTime > marker.time
                ? ((marker.endTime - marker.time) / duration) * 100
                : null;

            return width ? (
              <div
                key={`${marker.time}-${marker.label}-segment`}
                className="absolute inset-y-0 rounded-full bg-gradient-to-r from-amber-300/25 to-orange-300/25 border border-amber-400/20"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={marker.label}
              />
            ) : (
              <div
                key={`${marker.time}-${marker.label}`}
                className={cn(
                  "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] ring-1 ring-amber-400/30 transition-all duration-300 hover:scale-125 cursor-pointer",
                  markerHeight,
                  "w-[3px]"
                )}
                style={{ left: `${left}%`, marginLeft: "-1.5px" }}
                title={marker.label}
              />
            );
          })}

          {/* Note Markers on Timeline - larger on mobile */}
          {notes.map((note) => {
            const left = duration > 0 ? (note.time / duration) * 100 : 0;
            const isNear = Math.abs(note.time - currentTime) < 2;
            return (
              <div
                key={note.id}
                className={cn(
                  "absolute top-1/2 z-10 -translate-y-1/2 rounded-full transition-all duration-300 ring-1 ring-orange-400/30 hover:scale-125 cursor-pointer",
                  isNear
                    ? "h-5 w-5 bg-gradient-to-br from-orange-400 to-red-400 shadow-[0_0_20px_rgba(251,146,60,0.6)] animate-pulse"
                    : "h-3 w-3 bg-gradient-to-br from-orange-400 to-orange-500/80 shadow-[0_0_8px_rgba(251,146,60,0.4)]"
                )}
                style={{ left: `${left}%`, marginLeft: "-4px" }}
                title={note.text}
              />
            );
          })}

          {/* Interactive Question Markers on Timeline - larger on mobile */}
          {interactiveQuestions && interactiveQuestions.map((q) => {
            const timePos = q.timePosition ?? q.time ?? 0;
            const left = duration > 0 ? (timePos / duration) * 100 : 0;
            const isNear = Math.abs(timePos - currentTime) < 2;
            return (
              <div
                key={q.id}
                className={cn(
                  "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-white/50 transition-all duration-300 ring-2 ring-emerald-400/30 hover:scale-125 cursor-pointer",
                  isNear
                    ? "h-5 w-5 bg-gradient-to-br from-emerald-400 to-green-400 shadow-[0_0_20px_rgba(52,211,153,0.6)] animate-pulse"
                    : "h-3 w-3 bg-gradient-to-br from-emerald-500 to-green-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                )}
                style={{ left: `${left}%`, marginLeft: "-6px" }}
                title="سؤال تفاعلي"
              />
            );
          })}

          {/* Chapter boundary ticks — thin separators between consecutive
              chapter segments so divisions are visible without hovering. */}
          {chapters.length > 1 &&
            chapters.slice(1).map((chapter) => {
              const left = duration > 0 ? (chapter.time / duration) * 100 : 0;
              return (
                <div
                  key={`chapter-tick-${chapter.time}`}
                  className="absolute inset-y-0 z-10 w-px bg-black/40"
                  style={{ left: `${left}%` }}
                />
              );
            })}

          {/* Progress Thumb - larger on mobile */}
          <div
            className={cn(
              "absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-cyan-500 transition-all duration-300 ring-2 ring-blue-400/30",
              isDragging
                ? "h-7 w-7 shadow-[0_0_30px_rgba(59,130,246,0.8)]"
                : "h-5 w-5 shadow-[0_0_20px_rgba(59,130,246,0.6)] group-hover/progress:scale-110"
            )}
            style={{ left: `${safeProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Duration labels - larger on mobile */}
      <div className="flex items-center justify-between text-[14px] font-bold tabular-nums text-white/90 sm:text-[12px]">
        <span className="rounded-lg bg-white/5 px-3 py-1.5 text-white/80 backdrop-blur-sm transition-all hover:bg-white/10">{formatDuration(currentTime)}</span>
        <span className="rounded-lg bg-white/5 px-3 py-1.5 text-white/80 backdrop-blur-sm transition-all hover:bg-white/10">{formatDuration(duration)}</span>
      </div>
    </div>
  );
});