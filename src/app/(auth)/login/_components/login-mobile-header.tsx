'use client';

import { ShieldCheck } from 'lucide-react';

export function LoginMobileHeader() {
  return (
    <div className="lg:hidden text-center space-y-6 mb-12">
       <div className="mx-auto w-20 h-20 rounded-[2rem] bg-primary/20 border border-primary/30 flex items-center justify-center shadow-2xl">
          <ShieldCheck className="text-primary w-10 h-10" />
       </div>
       <div className="space-y-2">
         <h1 className="text-4xl font-black text-white">تولو التعليمية</h1>
         <p className="text-primary/60 text-xs font-black uppercase tracking-[0.4em]">Integrated Learning</p>
       </div>
    </div>
  );
}
