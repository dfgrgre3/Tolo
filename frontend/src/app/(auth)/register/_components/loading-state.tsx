'use client';

import { m } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-screen items-center justify-center bg-[#050505]"
    >
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <span className="text-[12px] font-black text-primary/50 uppercase tracking-[0.8em]">Syncing Identity</span>
      </div>
    </m.div>
  );
}
