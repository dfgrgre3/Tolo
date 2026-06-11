'use client';

import { m } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

export function LoginFormHeader() {
  return (
    <div className="space-y-3 text-center lg:text-right">
      {/* Mobile-only logo */}
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex lg:hidden items-center justify-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
          <GraduationCap className="text-primary w-5 h-5" />
        </div>
        <span className="text-white font-black text-lg">تولو</span>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          مرحباً بك <span className="text-primary">مجدداً</span>
        </h1>
      </m.div>
      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-400 font-medium text-base"
      >
        سجّل دخولك للمتابعة من حيث توقفت
      </m.p>
    </div>
  );
}
