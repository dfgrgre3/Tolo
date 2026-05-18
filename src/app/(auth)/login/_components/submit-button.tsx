'use client';

import { m } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubmitButtonProps {
  isSubmitting: boolean;
  loginMode: 'password' | 'magic-link';
}

export function SubmitButton({ isSubmitting, loginMode }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isSubmitting}
      className="h-20 w-full rounded-[1.5rem] bg-primary text-black font-black text-xl shadow-[0_25px_50px_rgba(255,109,0,0.3)] transition-all active:scale-[0.98] group relative overflow-hidden"
    >
      <m.div
        className="absolute inset-0 bg-white/30"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6 }}
      />
      {isSubmitting ? (
        <div className="flex items-center justify-center gap-4">
          <Loader2 className="h-7 w-7 animate-spin" />
          <span className="uppercase tracking-widest">جاري التحقق...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-5 relative z-10">
          <span className="uppercase tracking-[0.3em]">
            {loginMode === 'password' ? 'تأكيـد الـولـوج' : 'إرسـال رابـط الـولـوج'}
          </span>
          <m.div
            animate={{ x: [0, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowRight className="h-6 w-6 rotate-180" />
          </m.div>
        </div>
      )}
    </Button>
  );
}
