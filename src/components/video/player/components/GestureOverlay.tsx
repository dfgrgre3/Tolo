"use client";

import { memo } from "react";
import { Volume2, SunMedium, FastForward, Rewind, Zap } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type GestureOverlayProps = {
  mode: "volume" | "brightness" | "seek" | "speed" | null;
  value: number | string;
  visible: boolean;
};

const modeColors = {
  volume: { ring: "border-blue-400/50", bg: "bg-blue-500/10", text: "text-blue-400" },
  brightness: { ring: "border-amber-400/50", bg: "bg-amber-500/10", text: "text-amber-400" },
  speed: { ring: "border-orange-400/50", bg: "bg-orange-500/20", text: "text-orange-400" },
  seek: { ring: "border-cyan-400/50", bg: "bg-cyan-500/10", text: "text-cyan-400" },
};

const modeLabels = {
  volume: "الصوت",
  brightness: "السطوع",
  speed: "السرعة",
  seek: "انتقال",
};

const CircularProgress = ({ percentage, colorClass }: { percentage: number; colorClass: string }) => (
  <div className="relative mb-3 h-20 w-20">
    <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="34" strokeWidth="4" stroke="currentColor" fill="none" className="text-white/10" />
      <circle
        cx="40" cy="40" r="34"
        strokeWidth="4" stroke="currentColor" fill="none"
        className={cn("transition-all duration-100", colorClass)}
        strokeDasharray={`${2 * Math.PI * 34}`}
        strokeDashoffset={`${2 * Math.PI * 34 * (1 - percentage / 100)}`}
        strokeLinecap="round"
      />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-xl font-black text-white">{percentage}</span>
    </div>
  </div>
);

const SeekIndicator = ({ value }: { value: number }) => {
  const isForward = value > 0;
  return (
    <div className="mb-3 flex items-center gap-1">
      {isForward ? (
        <>
          <FastForward className="h-6 w-6 text-cyan-400 animate-pulse" />
          <FastForward className="h-6 w-6 text-cyan-400/60 animate-pulse" style={{ animationDelay: "0.1s" }} />
        </>
      ) : (
        <>
          <Rewind className="h-6 w-6 text-cyan-400/60 animate-pulse" style={{ animationDelay: "0.1s" }} />
          <Rewind className="h-6 w-6 text-cyan-400 animate-pulse" />
        </>
      )}
    </div>
  );
};

const renderGestureIcon = (
  mode: NonNullable<GestureOverlayProps["mode"]>,
  value: number | string,
  className: string
) => {
  if (mode === "speed") return <Zap className={className} />;
  if (mode === "seek") {
    return Number(value) > 0 ? <FastForward className={className} /> : <Rewind className={className} />;
  }
  if (mode === "brightness") return <SunMedium className={className} />;
  return <Volume2 className={className} />;
};

export const GestureOverlay = memo(({ mode, value, visible }: GestureOverlayProps) => {
  if (!mode || !visible) return null;

  const percentage = typeof value === "number" ? Math.round(value * 100) : null;
  const colors = modeColors[mode];
  const label = modeLabels[mode];

  const getDisplayValue = () => {
    if (mode === "speed") return `${value}x`;
    if (mode === "seek") return `${value}ث`;
    return `${percentage}%`;
  };

  const isSeek = mode === "seek";
  const isCircular = mode === "volume" || mode === "brightness";

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="pointer-events-none absolute inset-0 z-[100] flex items-center justify-center"
      >
        {isSeek && (
          <m.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "absolute h-24 w-24 rounded-full bg-cyan-400/20",
              Number(value) > 0 ? "right-1/4" : "left-1/4"
            )}
          />
        )}

        <div className={cn(
          "flex min-h-[140px] min-w-[140px] flex-col items-center justify-center rounded-[36px] border-2 bg-black/60 p-6 backdrop-blur-xl transition-all duration-300",
          colors.ring,
          visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        )}>
          {isCircular && percentage !== null && (
            <CircularProgress percentage={percentage} colorClass={colors.text} />
          )}

          {mode === "speed" && (
            <div className="mb-3 flex items-center justify-center">
              <m.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="rounded-2xl bg-orange-500 p-4 text-white shadow-lg shadow-orange-500/30"
              >
                {renderGestureIcon(mode, value, "h-8 w-8")}
              </m.div>
            </div>
          )}

          {isSeek && <SeekIndicator value={Number(value)} />}

          {isCircular && (
            <div className={cn("rounded-2xl p-2", colors.bg)}>
              {renderGestureIcon(mode, value, cn("h-5 w-5", colors.text))}
            </div>
          )}

          <div className="mt-2 text-center">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{label}</span>
            <span className={cn("text-2xl font-black", isSeek ? "text-cyan-400" : "text-white")}>
              {getDisplayValue()}
            </span>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
});

GestureOverlay.displayName = "GestureOverlay";
