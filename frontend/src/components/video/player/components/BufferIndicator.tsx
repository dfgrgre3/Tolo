/**
 * Buffer Indicator Component - Detailed buffer visualization
 * @module video/player/components/BufferIndicator
 */

import { useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BufferIndicatorProps {
  buffered: number; // Buffered time in seconds
  currentTime: number;
  duration: number;
  className?: string;
  showDetails?: boolean;
}

interface BufferSegment {
  start: number;
  end: number;
  percentage: number;
}

export function BufferIndicator({
  buffered,
  currentTime,
  duration,
  className,
  showDetails = false,
}: BufferIndicatorProps) {
  // Calculate buffer health
  const bufferHealth = useMemo(() => {
    const bufferAhead = buffered - currentTime;
    const bufferPercentage = (bufferAhead / duration) * 100;
    
    if (bufferPercentage >= 30) return { status: 'excellent', color: 'bg-emerald-500', text: 'ممتاز' };
    if (bufferPercentage >= 15) return { status: 'good', color: 'bg-blue-500', text: 'جيد' };
    if (bufferPercentage >= 5) return { status: 'fair', color: 'bg-yellow-500', text: 'متوسط' };
    return { status: 'poor', color: 'bg-red-500', text: 'ضعيف' };
  }, [buffered, currentTime, duration]);

  // Calculate buffer percentage
  const bufferPercentage = useMemo(() => {
    if (duration === 0) return 0;
    return (buffered / duration) * 100;
  }, [buffered, duration]);

  // Calculate current position percentage
  const currentPercentage = useMemo(() => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Buffer bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        {/* Buffered range */}
        <div
          className={cn(
            "absolute top-0 bottom-0 transition-all duration-300",
            bufferHealth.color
          )}
          style={{ width: `${bufferPercentage}%` }}
        />
        
        {/* Current position */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${currentPercentage}%` }}
        />
      </div>

      {/* Detailed info */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", bufferHealth.color)} />
            <span className="text-white/70">الخزين: {bufferHealth.text}</span>
          </div>
          <div className="text-white/50">
            {formatTime(buffered - currentTime)} متبقي
          </div>
        </div>
      )}
    </div>
  );
}

// Pre-buffering hook
export function usePreBuffer() {
  const preBufferRef = useRef<number | null>(null);
  const isPreBufferingRef = useRef(false);

  const startPreBuffer = useCallback((videoElement: HTMLVideoElement, targetBuffer: number = 30) => {
    if (isPreBufferingRef.current) return;
    
    isPreBufferingRef.current = true;
    
    const checkBuffer = () => {
      if (!videoElement) return;
      
      const buffered = videoElement.buffered;
      if (buffered.length === 0) return;
      
      const currentTime = videoElement.currentTime;
      const bufferedEnd = buffered.end(buffered.length - 1);
      const bufferAhead = bufferedEnd - currentTime;
      
      if (bufferAhead >= targetBuffer) {
        isPreBufferingRef.current = false;
        if (preBufferRef.current) {
          clearInterval(preBufferRef.current);
          preBufferRef.current = null;
        }
        return;
      }
      
      // Continue buffering
      videoElement.play().catch(() => {
        // Expected to fail if we're just pre-buffering
      });
    };
    
    preBufferRef.current = window.setInterval(checkBuffer, 500);
  }, []);

  const stopPreBuffer = useCallback(() => {
    isPreBufferingRef.current = false;
    if (preBufferRef.current) {
      clearInterval(preBufferRef.current);
      preBufferRef.current = null;
    }
  }, []);

  const isPreBuffering = useCallback(() => {
    return isPreBufferingRef.current;
  }, []);

  return {
    startPreBuffer,
    stopPreBuffer,
    isPreBuffering,
  };
}
