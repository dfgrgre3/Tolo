'use client';

import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepIndicator({ step }: { readonly step: number }) {
  return (
    <div className="flex items-center justify-center gap-4 px-4">
      {[1, 2].map((i) => {
        const isCurrentOrPassed = step >= i;
        return (
          <div key={i} className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border transition-all duration-300",
                isCurrentOrPassed
                  ? "bg-primary border-primary text-black shadow-[0_0_20px_rgba(255,109,0,0.3)]"
                  : "bg-muted border-border text-muted-foreground"
              )}
            >
              {step > i ? <Check className="w-6 h-6 stroke-[3px]" /> : i}
            </div>
            {i < 2 && (
              <div className="w-12 md:w-24 h-1 rounded-full bg-border overflow-hidden">
                <m.div
                  animate={{ width: step > i ? "100%" : "0%" }}
                  className="h-full bg-primary"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
