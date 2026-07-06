/**
 * Custom Playback Speed Component - Fine-grained speed control (0.05 steps)
 * @module video/player/components/CustomPlaybackSpeed
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";

interface CustomPlaybackSpeedProps {
  currentSpeed: number;
  onChangeSpeed: (speed: number) => void;
  className?: string;
}

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export function CustomPlaybackSpeed({
  currentSpeed,
  onChangeSpeed,
  className,
}: CustomPlaybackSpeedProps) {
  const [customSpeed, setCustomSpeed] = useState(currentSpeed.toFixed(2));
  const [isCustom, setIsCustom] = useState(!SPEED_PRESETS.includes(currentSpeed));

  const handlePresetClick = useCallback((speed: number) => {
    onChangeSpeed(speed);
    setCustomSpeed(speed.toFixed(2));
    setIsCustom(false);
  }, [onChangeSpeed]);

  const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const clamped = Math.max(0.05, Math.min(4, value));
    setCustomSpeed(clamped.toFixed(2));
    onChangeSpeed(clamped);
    setIsCustom(true);
  }, [onChangeSpeed]);

  const handleStep = useCallback((delta: number) => {
    const current = parseFloat(customSpeed);
    const next = Math.max(0.05, Math.min(4, current + delta));
    const rounded = Math.round(next * 100) / 100;
    setCustomSpeed(rounded.toFixed(2));
    onChangeSpeed(rounded);
    setIsCustom(true);
  }, [customSpeed, onChangeSpeed]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Current speed display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-sky-400" />
          <span className="text-sm font-bold text-white/90">سرعة التشغيل</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-white">
            {customSpeed}x
          </span>
          {isCustom && (
            <span className="text-xs font-bold text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-full">
              مخصص
            </span>
          )}
        </div>
      </div>

      {/* Fine control slider */}
      <div className="space-y-2">
        <input
          type="range"
          min="0.05"
          max="4"
          step="0.05"
          value={customSpeed}
          onChange={handleCustomChange}
          className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex justify-between text-xs text-white/50">
          <span>0.05x</span>
          <span>1x</span>
          <span>4x</span>
        </div>
      </div>

      {/* Step buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleStep(-0.05)}
          className="flex-1 py-2 text-sm font-bold text-white/90 bg-white/10 rounded-lg hover:bg-white/20 transition active:scale-95"
        >
          -0.05x
        </button>
        <button
          type="button"
          onClick={() => handleStep(0.05)}
          className="flex-1 py-2 text-sm font-bold text-white/90 bg-white/10 rounded-lg hover:bg-white/20 transition active:scale-95"
        >
          +0.05x
        </button>
      </div>

      {/* Preset speeds */}
      <div className="grid grid-cols-5 gap-2">
        {SPEED_PRESETS.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => handlePresetClick(speed)}
            className={cn(
              "py-2 text-xs font-bold rounded-lg transition active:scale-95",
              currentSpeed === speed && !isCustom
                ? "bg-sky-500 text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            )}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
