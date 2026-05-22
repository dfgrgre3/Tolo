"use client";

import { m } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedWatermarkProps {
  text: string;
  positionClass: string | undefined;
}

export function AnimatedWatermark({ text, positionClass }: AnimatedWatermarkProps) {
  return (
    <m.div
      animate={{
        x: [0, 100, -100, 0],
        y: [0, -50, 50, 0],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear",
      }}
      className={cn(
        "pointer-events-none absolute z-20 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/40 backdrop-blur-md",
        positionClass
      )}
    >
      {text}
    </m.div>
  );
}
