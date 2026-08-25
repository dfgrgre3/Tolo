/**
 * Timeline Preview Component - Preview thumbnails on hover
 * @module video/player/components/TimelinePreview
 */

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { ThumbnailCue } from "../types";

interface TimelinePreviewProps {
  thumbnails: ThumbnailCue[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
}

export function TimelinePreview({
  thumbnails,
  currentTime,
  duration,
  onSeek,
  className,
}: TimelinePreviewProps) {
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find thumbnail for given time
  const findThumbnail = useCallback((time: number): ThumbnailCue | null => {
    return thumbnails.find((thumb) => time >= thumb.start && time <= thumb.end) || null;
  }, [thumbnails]);

  // Handle mouse move on timeline
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;

    setPreviewTime(time);

    const thumb = findThumbnail(time);
    if (thumb) {
      setPreviewImage(thumb.imageUrl);
    } else {
      setPreviewImage(null);
    }
  }, [duration, findThumbnail]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setPreviewTime(null);
    setPreviewImage(null);
    setIsHovering(false);
  }, []);

  // Handle click to seek
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;

    onSeek(time);
  }, [duration, onSeek]);

  // Format time for display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative h-2 cursor-pointer", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovering(true)}
      onClick={handleClick}
    >
      {/* Progress bar background */}
      <div className="absolute inset-0 h-full bg-white/20 rounded-full" />
      
      {/* Progress bar fill */}
      <div
        className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-75"
        style={{ width: `${(currentTime / duration) * 100}%` }}
      />

      {/* Preview indicator */}
      {isHovering && previewTime !== null && (
        <>
          {/* Preview line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
            style={{ left: `${(previewTime / duration) * 100}%` }}
          />

          {/* Preview thumbnail popup */}
          {previewImage && (
            <div
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{ left: `${(previewTime / duration) * 100}%` }}
            >
              <div className="relative bg-black/90 rounded-lg overflow-hidden border border-white/20 shadow-xl">
                <Image
                  src={previewImage}
                  alt="Preview"
                  width={128}
                  height={72}
                  priority
                  unoptimized
                  className="block w-32 h-18 object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                  <span className="text-xs font-bold text-white">
                    {formatTime(previewTime)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
