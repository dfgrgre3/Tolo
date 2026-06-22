'use client';

import { m } from 'framer-motion';
import { Zap, Shield, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OTPInput } from './otp-input';

interface TwoFAPanelProps {
  readonly twoFactorCode: string;
  readonly setTwoFactorCode: (val: string) => void;
  readonly isSubmitting: boolean;
  readonly onVerify2FA: (e: React.FormEvent) => void;
  readonly onResend2FA?: () => void;
  readonly onBack: () => void;
  readonly title?: string;
  readonly subtitle?: string;
}

export function TwoFAPanel({ twoFactorCode, setTwoFactorCode, isSubmitting, onVerify2FA, onResend2FA, onBack, title = "الدرع المزدوج", subtitle = "أدخل رمز الحماية المكون من 6 أرقام لتأكيد الهوية" }: TwoFAPanelProps) {
  return (
    <m.div
      key="2fa-form"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: "backOut" }}
      className="space-y-12"
    >
      <div className="text-center space-y-8">
        <m.div
          animate={{
            boxShadow: ["0 0 20px rgba(255,109,0,0.2)", "0 0 50px rgba(255,109,0,0.4)", "0 0 20px rgba(255,109,0,0.2)"],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="mx-auto h-28 w-28 rounded-[2.5rem] bg-primary/10 border border-primary/30 flex items-center justify-center backdrop-blur-xl"
        >
          <Zap className="h-14 w-14 text-primary" />
        </m.div>
        <div className="space-y-3">
          <h3 className="text-4xl font-black text-foreground uppercase tracking-tight">{title}</h3>
          <p className="text-muted-foreground font-medium">{subtitle}</p>
        </div>
      </div>

      <form onSubmit={onVerify2FA} className="space-y-12">
        <div className="space-y-6">
          <OTPInput
            value={twoFactorCode}
            onChange={setTwoFactorCode}
            disabled={isSubmitting}
          />

          {onResend2FA && (
            <div className="text-center">
              <button
                type="button"
                onClick={onResend2FA}
                disabled={isSubmitting}
                className="text-sm font-semibold text-primary/80 hover:text-primary hover:underline transition-all focus:outline-none disabled:opacity-50 disabled:hover:no-underline"
              >
                لم يصلك الرمز؟ إعادة إرسال الرمز
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Button
            type="submit"
            disabled={isSubmitting || twoFactorCode.length < 6}
            className="h-20 w-full rounded-[1.5rem] bg-primary text-black font-black text-xl shadow-[0_25px_50px_rgba(255,109,0,0.3)] transition-all active:scale-[0.97] group relative overflow-hidden"
          >
             <m.div
                className="absolute inset-0 bg-white/30"
                initial={{ y: "100%" }}
                whileHover={{ y: 0 }}
                transition={{ duration: 0.3 }}
              />
             <span className="relative z-10 flex items-center justify-center gap-3">
              {isSubmitting ? <Loader2 className="h-7 w-7 animate-spin" /> : (
                <>
                  <Shield size={22} />
                  تحقق وآمن
                </>
              )}
             </span>
          </Button>

          <button
            type="button"
            onClick={onBack}
            className="w-full text-[12px] font-black text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.4em] flex items-center justify-center gap-2"
          >
            <ArrowRight size={14} /> العودة للخلف
          </button>
        </div>
      </form>
    </m.div>
  );
}
