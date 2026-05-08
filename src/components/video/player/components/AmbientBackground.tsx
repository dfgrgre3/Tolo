"use client";

import { useEffect, useRef, memo } from "react";
import { useCourseVideoPlayerStore } from "../store";
import { useEfficiencyMode } from "@/hooks";

type AmbientBackgroundProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  provider: string;
};

export const AmbientBackground = memo(({ videoRef, provider }: AmbientBackgroundProps) => {
  const isAmbientMode = useCourseVideoPlayerStore((state) => state.isAmbientMode);
  const isPlaying = useCourseVideoPlayerStore((state) => state.isPlaying);
  const isEfficiencyMode = useEfficiencyMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isAmbientMode || isEfficiencyMode || provider === "youtube" || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;
    let lastUpdate = 0;
    const FPS_INTERVAL = 1000 / 15; // 15fps is enough for ambient glow

    const updateAmbient = (timestamp: number) => {
      if (video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(updateAmbient);
        return;
      }

      // Throttle to ~15fps for performance
      if (timestamp - lastUpdate >= FPS_INTERVAL) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        lastUpdate = timestamp;
      }

      animationFrameId = requestAnimationFrame(updateAmbient);
    };

    animationFrameId = requestAnimationFrame(updateAmbient);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAmbientMode, provider, videoRef, isEfficiencyMode]);

  if (!isAmbientMode || isEfficiencyMode) return null;

  return (
    <div className="pointer-events-none absolute inset-[-15%] -z-10 overflow-hidden opacity-60 blur-[100px] transition-opacity duration-1000">
      {provider === "youtube" ? (
        // Fallback for YouTube: Multi-layered animated gradients with enhanced depth
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.4),transparent_50%),radial-gradient(circle_at_bottom_left,_rgba(147,51,234,0.3),transparent_50%),radial-gradient(circle_at_bottom_right,_rgba(234,179,8,0.2),transparent_50%)] animate-pulse" />
          <div 
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.25),transparent_60%)] animate-pulse"
            style={{ animationDelay: "0.5s", animationDuration: "3s" }}
          />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={16}
          height={9}
          className="h-full w-full object-cover scale-[1.2]"
        />
      )}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
});

AmbientBackground.displayName = "AmbientBackground";
