"use client";

import { m, AnimatePresence } from "framer-motion";
import { StickyNote } from "lucide-react";

interface ActiveNotePopupProps {
  text: string;
  visible: boolean;
}

export function ActiveNotePopup({ text, visible }: ActiveNotePopupProps) {
  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.9 }}
          className="absolute right-6 top-20 z-50 max-w-[280px]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-xl">
            <div className="absolute left-0 top-0 h-full w-1 bg-orange-500" />
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-lg bg-orange-500/10 p-2 text-orange-500">
                <StickyNote className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">ملاحظتك السابقة</p>
                <p className="mt-1 text-sm font-bold leading-relaxed text-slate-100 line-clamp-3">
                  {text}
                </p>
              </div>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
