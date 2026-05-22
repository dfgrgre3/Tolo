'use client';

import { m } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-20">
      <div className="relative">
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-48 h-48 rounded-full border-2 border-primary/10 border-t-primary/40"
        />
        <m.div
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 rounded-full border-2 border-white/5 border-b-primary/30"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <m.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_50px_rgba(255,109,0,0.2)]"
          >
            <ShieldCheck className="text-primary w-10 h-10" />
          </m.div>
        </div>
      </div>
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">جاري المصادقة الآمنة</h2>
        <div className="flex items-center justify-center gap-3">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <p className="text-primary/50 text-[10px] font-black uppercase tracking-[0.4em]">Establishing Neural Link</p>
        </div>
      </div>
    </div>
  );
}
