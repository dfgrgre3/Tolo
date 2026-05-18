'use client';

import { m } from 'framer-motion';
import { Wand2 } from 'lucide-react';

export function RegisterHeader() {
  return (
    <div className="text-center space-y-6">
      <m.div
        whileHover={{ scale: 1.05, rotate: 5 }}
        className="mx-auto w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.15)] cursor-default"
      >
        <Wand2 className="w-12 h-12 text-primary" />
      </m.div>
      <div className="space-y-2">
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-tight">
           إنشاء <span className="text-primary">هوية تولو</span>
        </h1>
        <p className="text-gray-500 font-bold text-lg tracking-wide uppercase">مرحباً بك في مستقبل التعليم الرقمي</p>
      </div>
    </div>
  );
}
