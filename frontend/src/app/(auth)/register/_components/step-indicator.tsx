'use client';

import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepIndicator({ step }: { readonly step: number }) {
  return (
    <div className="flex items-center justify-center gap-4 px-4">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <m.div
            animate={{
              backgroundColor: step >= i ? "rgba(255,109,0,1)" : "rgba(255,255,255,0.05)",
              borderColor: step >= i ? "rgba(255,109,0,1)" : "rgba(255,255,255,0.1)",
              color: step >= i ? "#000" : "#4b5563"
            }}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border transition-all",
              step >= i ? "shadow-[0_0_20px_rgba(255,109,0,0.3)]" : ""
            )}
          >
            {step > i ? <Check className="w-6 h-6 stroke-[3px]" /> : i}
          </m.div>
          {i < 2 && (
            <div className="w-12 md:w-24 h-1 rounded-full bg-white/5 overflow-hidden">
              <m.div
                animate={{ width: step > i ? "100%" : "0%" }}
                className="h-full bg-primary"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
