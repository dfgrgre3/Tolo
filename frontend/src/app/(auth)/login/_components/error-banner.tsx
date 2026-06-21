import { m } from 'framer-motion';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  readonly errorStatus: string;
  readonly onResendVerification: () => void;
  readonly onDismiss?: () => void;
}

/** Translate common Clerk / server error strings to human-friendly Arabic */
function humanizeError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('password is incorrect') || lower.includes('invalid password') || lower.includes('identifier or password is incorrect'))
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.';
  if (lower.includes('too many requests') || lower.includes('rate limit'))
    return 'عدد كبير من المحاولات. يرجى الانتظار قليلاً ثم المحاولة مجدداً.';
  if (lower.includes('email address') && lower.includes('not found'))
    return 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.';
  if (lower.includes('not allowed') || lower.includes('blocked'))
    return 'هذا الحساب موقوف مؤقتاً. يرجى التواصل مع الدعم.';
  if (lower.includes('network') || lower.includes('fetch'))
    return 'مشكلة في الاتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مجدداً.';
  if (lower.includes('auth system not fully loaded'))
    return 'لم يكتمل تحميل نظام الدخول بعد. يرجى المحاولة مجدداً.';
  // Already Arabic - return as-is
  return raw;
}

export function ErrorBanner({ errorStatus, onResendVerification, onDismiss }: ErrorBannerProps) {
  const message = humanizeError(errorStatus);
  const lowerStatus = errorStatus.toLowerCase();
  const showResend = errorStatus.includes('تفعيل') || lowerStatus.includes('verification') || lowerStatus.includes('verify');

  return (
    <m.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300 text-sm flex items-start gap-3 shadow-lg backdrop-blur-xl"
      role="alert"
    >
      <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className="h-4 w-4 text-red-400" />
      </div>

      <div className="flex-1 space-y-2 min-w-0">
        <p className="font-semibold text-red-600 dark:text-red-300 leading-snug">{message}</p>
        {showResend && (
          <button
            type="button"
            onClick={onResendVerification}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/80 hover:text-primary transition-colors"
          >
            <RefreshCw size={9} />
            إعادة إرسال رابط التفعيل
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
          aria-label="إغلاق"
        >
          <X size={14} />
        </button>
      )}
    </m.div>
  );
}
