import { m } from "framer-motion";
import { AlertCircle } from 'lucide-react';

export function VerificationWarning({ verified }: { verified: boolean }) {
  if (verified) return null;
  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20"
    >
      <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-orange-300">البريد الإلكتروني غير مفعّل</p>
        <p className="text-xs text-orange-400/70 mt-1">لم يتم تفعيل بريدك الإلكتروني. تحقق من بريدك الوارد للعثور على رابط التفعيل.</p>
      </div>
    </m.div>
  );
}
