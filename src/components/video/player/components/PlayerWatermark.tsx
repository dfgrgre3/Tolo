  "use client";

import { useShallow } from "zustand/react/shallow";
import { useCourseVideoPlayerStore } from "../store";
import { WATERMARK_POSITIONS } from "../constants";

export function PlayerWatermark({ text }: { text: string }) {
  const watermarkIndex = useCourseVideoPlayerStore((state) => state.watermarkIndex);
  const position = WATERMARK_POSITIONS[watermarkIndex] || WATERMARK_POSITIONS[0];

  return (
    <div
      className={`pointer-events-none absolute ${position} z-10 select-none opacity-20 transition-all duration-1000`}
    >
      <div className="rounded-lg bg-black/40 px-3 py-1.5 backdrop-blur-sm">
        <p className="text-[11px] font-black tracking-widest text-white/80">
          {text}
        </p>
      </div>
    </div>
  );
}
