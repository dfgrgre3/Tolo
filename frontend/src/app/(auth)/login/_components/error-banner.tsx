'use client';

import { m } from 'framer-motion';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface ErrorBannerProps {
  readonly errorStatus: string;
  readonly onResendVerification: () => void;
}

export function ErrorBanner({ errorStatus, onResendVerification }: ErrorBannerProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-start gap-4 shadow-2xl backdrop-blur-xl"
    >
      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="flex-1 space-y-2 pt-1">
        <p>{errorStatus}</p>
        {errorStatus.includes('تفعيل') && (
          <button
            type="button"
            onClick={onResendVerification}
            className="text-[10px] font-black underline uppercase tracking-widest text-primary/80 hover:text-primary transition-colors flex items-center gap-1"
          >
            إعادة إرسال الرابط <ArrowRight size={10} className="rotate-180" />
          </button>
        )}
      </div>
    </m.div>
  );
}
