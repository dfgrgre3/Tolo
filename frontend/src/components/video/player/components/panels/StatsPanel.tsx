'use client';

import { AnimatePresence, m } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatsPanel({ isStatsOpen, isEfficiencyMode, statsItems, audioTracks, onCloseStats }: any) {
  return (
    <AnimatePresence>
      {isStatsOpen ? (
        <m.div
          initial={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
          animate={isEfficiencyMode ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
          transition={isEfficiencyMode ? { duration: 0 } : undefined}
          className={cn("absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6", !isEfficiencyMode && "backdrop-blur-xl")}
          onClick={onCloseStats}>
          <div className="w-full max-w-lg rounded-[30px] border border-white/10 bg-slate-950/90 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xl font-black text-white">إحصاءات المشغل</p>
                <p className="text-sm text-white/50">معلومات مباشرة عن الجلسة الحالية</p>
              </div>
              <button type="button" onClick={onCloseStats}
                className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="إغلاق الإحصاءات">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {statsItems.map((item: any) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">{item.label}</p>
                  <p className="mt-2 text-lg font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
            {audioTracks.length > 0 ? (
              <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">مسارات صوتية متاحة</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {audioTracks.map((track: any) => (
                    <span key={track.id} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/75">
                      {track.label} {track.language.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
