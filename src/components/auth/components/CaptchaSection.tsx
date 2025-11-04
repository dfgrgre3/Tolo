'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CaptchaWidget } from '../CaptchaWidget';
import { toast } from 'sonner';

interface CaptchaSectionProps {
  requiresCaptcha: boolean;
  captchaToken: string | null;
  onVerify: (token: string) => void;
  onError: (error: string) => void;
}

export function CaptchaSection({
  requiresCaptcha,
  captchaToken,
  onVerify,
  onError,
}: CaptchaSectionProps) {
  if (!requiresCaptcha) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 space-y-3"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-sm text-yellow-200">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span className="font-semibold">مطلوب التحقق من الأمان</span>
        </div>
        <CaptchaWidget
          siteKey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
          provider="hcaptcha"
          onVerify={(token) => {
            onVerify(token);
            toast.success('تم التحقق من CAPTCHA بنجاح');
          }}
          onError={(error) => {
            onError(error);
            toast.error(error);
          }}
          theme="dark"
        />
        <AnimatePresence>
          {captchaToken && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, height: 0 }}
              animate={{ opacity: 1, scale: 1, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 text-sm text-green-300"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>تم التحقق بنجاح</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

