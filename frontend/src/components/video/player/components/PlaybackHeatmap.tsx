/**
 * Playback Heatmap Component - Visualize most watched segments
 * @module video/player/components/PlaybackHeatmap
 */

import { useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PlaybackHeatmapProps {
  watchData: Array<{ time: number; count: number }>;
  duration: number;
  className?: string;
}

export function PlaybackHeatmap({
  watchData,
  duration,
  className,
}: PlaybackHeatmapProps) {
  // Process watch data into segments
  const segments = useMemo(() => {
    if (!watchData || watchData.length === 0) return [];

    const segmentCount = 100; // Divide video into 100 segments
    const segmentDuration = duration / segmentCount;
    const counts = new Array(segmentCount).fill(0);

    // Aggregate watch counts into segments
    watchData.forEach(({ time, count }) => {
      const segmentIndex = Math.min(
        Math.floor(time / segmentDuration),
        segmentCount - 1
      );
      counts[segmentIndex] += count;
    });

    // Find max count for normalization
    const maxCount = Math.max(...counts, 1);

    // Generate segments with normalized intensity
    return counts.map((count, index) => ({
      start: index * segmentDuration,
      end: (index + 1) * segmentDuration,
      intensity: count / maxCount, // 0 to 1
      count,
    }));
  }, [watchData, duration]);

  if (segments.length === 0) {
    return null;
  }

  // Get color based on intensity
  const getColor = (intensity: number) => {
    if (intensity < 0.2) return "bg-blue-500/30";
    if (intensity < 0.4) return "bg-blue-500/50";
    if (intensity < 0.6) return "bg-sky-500/60";
    if (intensity < 0.8) return "bg-sky-400/70";
    return "bg-emerald-400/80";
  };

  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full", className)}>
      {segments.map((segment, index) => (
        <div
          key={index}
          className={cn(
            "absolute top-0 bottom-0 transition-all duration-300",
            getColor(segment.intensity)
          )}
          style={{
            left: `${(segment.start / duration) * 100}%`,
            width: `${((segment.end - segment.start) / duration) * 100}%`,
          }}
          title={`مشاهد ${segment.count} مرة`}
        />
      ))}
    </div>
  );
}

// Hook to collect watch data
export function usePlaybackHeatmap() {
  const watchDataRef = useRef<Array<{ time: number; count: number }>>([]);

  const recordWatch = useCallback((time: number) => {
    const roundedTime = Math.floor(time);
    const existing = watchDataRef.current.find((d: { time: number; count: number }) => d.time === roundedTime);
    
    if (existing) {
      existing.count += 1;
    } else {
      watchDataRef.current.push({ time: roundedTime, count: 1 });
    }
  }, []);

  const getWatchData = useCallback(() => {
    return watchDataRef.current;
  }, []);

  const clearWatchData = useCallback(() => {
    watchDataRef.current = [];
  }, []);

  return {
    recordWatch,
    getWatchData,
    clearWatchData,
  };
}
