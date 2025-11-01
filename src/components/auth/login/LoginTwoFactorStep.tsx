import type { FormEvent } from 'react';
import { Button } from '@/shared/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Fingerprint,
  Loader2,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import type { TwoFactorState } from './types';
import { TWO_FACTOR_METHOD_LABELS } from './constants';

interface LoginTwoFactorStepProps {
  state: TwoFactorState;
  code: string;
  trustDevice: boolean;
  isSubmitting: boolean;
  resendCooldown: number;
  formatTimeLeft: (seconds: number) => string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChangeCode: (value: string) => void;
  onTrustDeviceChange: (checked: boolean) => void;
  onResend: () => void;
  onBack: () => void;
}

export function LoginTwoFactorStep({
  state,
  code,
  trustDevice,
  isSubmitting,
  resendCooldown,
  formatTimeLeft,
  onSubmit,
  onChangeCode,
  onTrustDeviceChange,
  onResend,
  onBack,
}: LoginTwoFactorStepProps) {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="rounded-xl bg-indigo-50/80 p-4 text-right text-sm text-slate-700 shadow-inner dark:bg-indigo-500/10 dark:text-slate-200">
        <p className="flex items-center justify-end gap-2 font-medium text-indigo-700 dark:text-indigo-200">
          <Fingerprint className="h-4 w-4" />
          ���?�?�? ��?�?�? �?�?�?�?�?�?
        </p>
        <p className="mt-1 leading-6">
          ��?�?�? �?�?�� �?�?�?�?�?�? �?�?�?�?�?�?�? �?�? 6 ��?�?�?�? �?�?�?�?�?�? �?�?�?{' '}
          {state.methods
            .map((method) => TWO_FACTOR_METHOD_LABELS[method] ?? method)
            .join(' ��? ')}
          .
        </p>
        {state.expiresAt && (
          <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-300">
            �?�?�?�?�? ���?�?�?�?�? �?�?�?�?�� �?�?{' '}
            {new Date(state.expiresAt).toLocaleTimeString()}.
          </p>
        )}
        {process.env.NODE_ENV !== 'production' && state.debugCode && (
          <div className="mt-3 rounded-lg border border-dashed border-indigo-400 bg-white/60 px-3 py-2 text-left text-sm font-mono text-indigo-600 dark:bg-slate-900/70 dark:text-indigo-200">
            �?�?�� �?�?�?���?�?�?: {state.debugCode}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="otp"
          className="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-200"
        >
          �?�?�� �?�?�?�?�?�?
          <Smartphone className="h-4 w-4 text-indigo-500" />
        </Label>
        <Input
          id="otp"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="123456"
          dir="ltr"
          value={code}
          onChange={(event) => onChangeCode(event.target.value)}
          required
          maxLength={6}
          className="text-center text-lg tracking-[8px]"
        />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <label className="flex items-center gap-2">
            <span>تذكر هذا الجهاز لمدة 30 يومًا</span>
            <Checkbox
              checked={trustDevice}
              onCheckedChange={(checked) => onTrustDeviceChange(Boolean(checked))}
            />
          </label>
          <button
            type="button"
            onClick={onResend}
            disabled={resendCooldown > 0}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 disabled:text-slate-400"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            إعادة إرسال الكود
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          className="order-2 text-slate-500 hover:text-slate-700 sm:order-1"
          onClick={onBack}
        >
          <ArrowLeft className="ml-2 h-4 w-4" />
          �?�?�?�?�?�?
        </Button>
        <Button
          type="submit"
          className="order-1 w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:order-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              �?�?�?�? �?�?�?�?�?�?...
            </span>
          ) : (
            '�?��?�?�? �?�?�?�?��'
          )}
        </Button>
      </div>
    </form>
  );
}
