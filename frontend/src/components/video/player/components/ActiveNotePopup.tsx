"use client";

import { m, AnimatePresence } from "framer-motion";
import { StickyNote, Clock3 } from "lucide-react";
import { formatDuration } from "../utils";
import { useCourseVideoPlayerStore } from "../store";

interface ActiveNotePopupProps {
  notes: Array<{ time: number; text: string }>;
}

export function ActiveNotePopup({ notes }: ActiveNotePopupProps) {
  const currentTime = useCourseVideoPlayerStore((state) => state.currentTime);
  const activeNote = notes.find(n => Math.abs(n.time - currentTime) < 2);
  
  const visible = !!activeNote;
  const text = activeNote?.text || "";
  const time = activeNote?.time;

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, x: 20, scale: 0.9, y: -5 }}
          animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
          exit={{ opacity: 0, x: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute right-6 top-20 z-50 max-w-[300px]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl">
            {/* Accent stripe */}
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-orange-500 to-amber-500" />
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-orange-500/10 p-2 text-orange-500">
                <StickyNote className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">ملاحظتك السابقة</p>
                  {time !== undefined && (
                    <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                       <Clock3 className="h-2.5 w-2.5" />
                      {formatDuration(time)}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-bold leading-relaxed text-slate-100 line-clamp-3">
                  {text}
                </p>
              </div>
            </div>
            {/* Subtle glow */}
            <div className="pointer-events-none absolute -bottom-4 -left-4 h-12 w-12 rounded-full bg-orange-500/20 blur-xl" />
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
