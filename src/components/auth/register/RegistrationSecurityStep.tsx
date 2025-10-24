import type { FormEvent } from 'react';
import { Button } from '@/shared/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Fingerprint,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  PasswordRequirement,
  RegistrationFormErrors,
  RegistrationSecurityState,
} from './types';
import { RegistrationPasswordStrength } from './RegistrationPasswordStrength';

interface RegistrationSecurityStepProps {
  security: RegistrationSecurityState;
  errors: RegistrationFormErrors;
  passwordScore: number;
  passwordLabel: string;
  passwordRequirements: PasswordRequirement[];
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (
    field: 'password' | 'confirmPassword',
    value: string,
  ) => void;
  onToggleChange: (
    field: 'acceptTerms' | 'enableTwoFactor' | 'marketingOptIn',
    value: boolean,
  ) => void;
  onBack: () => void;
}

export function RegistrationSecurityStep({
  security,
  errors,
  passwordScore,
  passwordLabel,
  passwordRequirements,
  isSubmitting,
  onSubmit,
  onFieldChange,
  onToggleChange,
  onBack,
}: RegistrationSecurityStepProps) {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label
          htmlFor="register-password"
          className="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-200"
        >
          كلمة المرور
          <Lock className="h-4 w-4 text-indigo-500" />
        </Label>
        <Input
          id="register-password"
          type="password"
          placeholder="••••••••"
          value={security.password}
          onChange={(event) => onFieldChange('password', event.target.value)}
          required
          autoComplete="new-password"
          className={cn(
            'text-right',
            errors.password
              ? 'border-rose-500 focus-visible:ring-rose-500 focus-visible:ring-offset-0'
              : '',
          )}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'register-password-error' : undefined}
        />
        {errors.password && (
          <p
            id="register-password-error"
            className="text-xs font-medium text-rose-600 dark:text-rose-400 text-right"
          >
            {errors.password}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="register-confirm-password"
          className="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-200"
        >
          تأكيد كلمة المرور
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
        </Label>
        <Input
          id="register-confirm-password"
          type="password"
          placeholder="••••••••"
          value={security.confirmPassword}
          onChange={(event) =>
            onFieldChange('confirmPassword', event.target.value)
          }
          required
          autoComplete="new-password"
          className={cn(
            'text-right',
            errors.confirmPassword
              ? 'border-rose-500 focus-visible:ring-rose-500 focus-visible:ring-offset-0'
              : '',
          )}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword ? 'register-confirm-password-error' : undefined
          }
        />
        {errors.confirmPassword && (
          <p
            id="register-confirm-password-error"
            className="text-xs font-medium text-rose-600 dark:text-rose-400 text-right"
          >
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <RegistrationPasswordStrength
        score={passwordScore}
        label={passwordLabel}
        requirements={passwordRequirements}
      />

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white/70 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
        <label className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 font-medium text-right">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            أوافق على الشروط والأحكام
          </span>
          <Checkbox
            checked={security.acceptTerms}
            onCheckedChange={(checked) =>
              onToggleChange('acceptTerms', Boolean(checked))
            }
          />
        </label>
        {errors.acceptTerms && (
          <p className="text-rose-500">{errors.acceptTerms}</p>
        )}

        <label className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-right">
            <Fingerprint className="h-4 w-4 text-indigo-500" />
            تفعيل المصادقة الثنائية بعد التسجيل
          </span>
          <Checkbox
            checked={security.enableTwoFactor}
            onCheckedChange={(checked) =>
              onToggleChange('enableTwoFactor', Boolean(checked))
            }
          />
        </label>

        <label className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-right">
            <Sparkles className="h-4 w-4 text-purple-500" />
            الاشتراك في الرسائل والمحتوى المخصص
          </span>
          <Checkbox
            checked={security.marketingOptIn}
            onCheckedChange={(checked) =>
              onToggleChange('marketingOptIn', Boolean(checked))
            }
          />
        </label>
      </div>

      <Button
        type="submit"
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب الآن'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full text-slate-500 hover:text-slate-700"
        onClick={onBack}
      >
        العودة لتعديل البيانات
      </Button>
    </form>
  );
}
