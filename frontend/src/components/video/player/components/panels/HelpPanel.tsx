'use client';

import { AnimatePresence, m } from "framer-motion";
import { ChevronRight, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function HelpPanel({ isHelpOpen, isEfficiencyMode, shortcuts, onCloseHelp }: any) {
  return (
    <AnimatePresence>
      {isHelpOpen ? (
        <m.div
          initial={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          animate={isEfficiencyMode ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          transition={isEfficiencyMode ? { duration: 0 } : undefined}
          className={cn("absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-6", !isEfficiencyMode && "backdrop-blur-xl")}
          onClick={onCloseHelp}>
          <div className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-slate-950/90 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300"><Keyboard className="h-5 w-5" /></div>
                <div>
                  <p className="text-xl font-black text-white">اختصارات لوحة المفاتيح</p>
                  <p className="text-sm text-white/50">اضغط داخل المشغل أولًا ثم استخدم الاختصارات</p>
                </div>
              </div>
              <button type="button" onClick={onCloseHelp}
                className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="إغلاق المساعدة">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {shortcuts.map(([shortcut, description]: any) => (
                <div key={shortcut} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm font-bold text-white/75">{description}</span>
                  <kbd className="rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-xs font-black text-blue-200">{shortcut}</kbd>
                </div>
              ))}
            </div>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
