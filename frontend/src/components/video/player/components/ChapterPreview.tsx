/**
 * Chapter Preview Component - Preview chapters on timeline
 * @module video/player/components/ChapterPreview
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { BookmarkItem } from "../types";

interface ChapterPreviewProps {
  chapters: BookmarkItem[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  className?: string;
}

export function ChapterPreview({
  chapters,
  duration,
  currentTime,
  onSeek,
  className,
}: ChapterPreviewProps) {
  // Calculate chapter positions on timeline
  const chapterPositions = useMemo(() => {
    return chapters.map((chapter) => ({
      ...chapter,
      position: (chapter.time / duration) * 100,
      width: chapter.endTime ? ((chapter.endTime - chapter.time) / duration) * 100 : 0,
      isActive: currentTime >= chapter.time && (!chapter.endTime || currentTime <= chapter.endTime),
    }));
  }, [chapters, duration, currentTime]);

  if (chapters.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative h-2 w-full", className)}>
      {/* Background */}
      <div className="absolute inset-0 bg-white/10 rounded-full" />
      
      {/* Chapter markers */}
      {chapterPositions.map((chapter, index) => (
        <div
          key={chapter.id || index}
          className={cn(
            "absolute top-0 bottom-0 rounded-sm cursor-pointer transition-all hover:brightness-125",
            chapter.isActive ? "bg-blue-500" : "bg-white/30"
          )}
          style={{
            left: `${chapter.position}%`,
            width: chapter.width > 0 ? `${chapter.width}%` : "2px",
          }}
          onClick={() => onSeek(chapter.time)}
          title={chapter.label}
        />
      ))}
      
      {/* Chapter labels for active chapter */}
      {chapterPositions.find((c) => c.isActive) && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg">
            {chapterPositions.find((c) => c.isActive)?.label}
          </span>
        </div>
      )}
    </div>
  );
}

// Chapter list component for sidebar
export function ChapterList({
  chapters,
  currentTime,
  onSeek,
  className,
}: {
  chapters: BookmarkItem[];
  currentTime: number;
  onSeek: (time: number) => void;
  className?: string;
}) {
  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.time - b.time);
  }, [chapters]);

  return (
    <div className={cn("space-y-2", className)}>
      {sortedChapters.map((chapter, index) => {
        const isActive = currentTime >= chapter.time && 
          (!chapter.endTime || currentTime <= chapter.endTime);
        
        return (
          <button
            key={chapter.id || index}
            type="button"
            onClick={() => onSeek(chapter.time)}
            className={cn(
              "w-full text-right px-4 py-3 rounded-xl transition-all",
              isActive
                ? "bg-blue-500/20 border border-blue-500/30"
                : "bg-white/5 border border-white/10 hover:bg-white/10"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-sm font-bold truncate",
                  isActive ? "text-blue-300" : "text-white/90"
                )}>
                  {chapter.label}
                </p>
                {chapter.endTime && (
                  <p className="text-xs text-white/50 mt-1">
                    {formatTime(chapter.time)} - {formatTime(chapter.endTime)}
                  </p>
                )}
              </div>
              {isActive && (
                <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                  جاري
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
