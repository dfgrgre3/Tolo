'use client';

import { m } from 'framer-motion';
import { Chrome, Github } from 'lucide-react';

export function AuthProviders() {
  return (
    <>
      <div className="relative py-2">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
        <span className="relative block mx-auto w-fit bg-[#080808] px-6 text-[11px] font-black uppercase tracking-[0.4em] text-gray-600">
          أو عبر المنصات
        </span>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <m.button
          whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { globalThis.location.href = `/api/auth/oauth/google`; }}
          type="button"
          className="flex items-center justify-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] h-16 transition-all shadow-sm"
        >
          <Chrome className="h-5 w-5 text-red-500" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Google</span>
        </m.button>
        <m.button
          whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { globalThis.location.href = `/api/auth/oauth/github`; }}
          type="button"
          className="flex items-center justify-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] h-16 transition-all shadow-sm"
        >
          <Github className="h-5 w-5 text-white" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Github</span>
        </m.button>
      </div>
    </>
  );
}
