import type { FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, Loader2, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CredentialsState, LoginFormErrors } from './types';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { WebAuthnService } from '@/lib/webauthn';

// Social Media Icons as inline SVG components
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface LoginCredentialsStepProps {
  credentials: CredentialsState;
  errors: LoginFormErrors;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof CredentialsState, value: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onSocialLogin: (provider: 'google' | 'github' | 'twitter') => void;
}

export function LoginCredentialsStep({
  credentials,
  errors,
  isSubmitting,
  onSubmit,
  onFieldChange,
  onRememberMeChange,
  onSocialLogin,
}: LoginCredentialsStepProps) {
  const handleBiometricLogin = async () => {
    try {
      if (!WebAuthnService.isSupported()) {
        alert('المتصفح الخاص بك لا يدعم المصادقة البيومترية');
        return;
      }
      
      const { token, user } = await WebAuthnService.authenticate();
      // Handle successful authentication
      
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(`فشل المصادقة: ${errorObj.message || 'حدث خطأ غير متوقع'}`);
    }
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-200"
        >
          البريد الإلكتروني
          <Mail className="h-4 w-4 text-indigo-500" />
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="example@student.com"
          dir="ltr"
          value={credentials.email}
          onChange={(event) => onFieldChange('email', event.target.value)}
          required
          className={cn(
            'text-right',
            errors.email
              ? 'border-rose-500 focus-visible:ring-rose-500 focus-visible:ring-offset-0'
              : '',
          )}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
        />
        {errors.email && (
          <p
            id="login-email-error"
            className="text-xs font-medium text-rose-600 dark:text-rose-400 text-right"
          >
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-200"
        >
          كلمة المرور
          <Lock className="h-4 w-4 text-indigo-500" />
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="********"
          value={credentials.password}
          onChange={(event) => onFieldChange('password', event.target.value)}
          required
          className={cn(
            'text-right',
            errors.password
              ? 'border-rose-500 focus-visible:ring-rose-500 focus-visible:ring-offset-0'
              : '',
          )}
          autoComplete="current-password"
          minLength={8}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
        />
        {credentials.password && <PasswordStrengthMeter password={credentials.password} />}
        {errors.password && (
          <p
            id="login-password-error"
            className="text-xs font-medium text-rose-600 dark:text-rose-400 text-right"
          >
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <button
          type="button"
          className="text-indigo-500 transition hover:text-indigo-600"
        >
          نسيت كلمة المرور؟
        </button>
        <label className="flex items-center gap-2">
          <span>تذكرني</span>
          <Checkbox
            checked={credentials.rememberMe}
            onCheckedChange={(checked) =>
              onRememberMeChange(Boolean(checked))
            }
          />
        </label>
      </div>

      <Button
        type="submit"
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري تسجيل الدخول...
          </span>
        ) : (
          'تسجيل الدخول'
        )}
      </Button>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
        أو تسجيل الدخول باستخدام
        <span className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center gap-2 border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
          onClick={() => onSocialLogin('google')}
        >
          <GoogleIcon className="h-4 w-4" />
          <span>Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center gap-2 border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
          onClick={() => onSocialLogin('github')}
        >
          <GitHubIcon className="h-4 w-4" />
          <span>GitHub</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center gap-2 border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
          onClick={() => onSocialLogin('twitter')}
        >
          <TwitterIcon className="h-4 w-4" />
          <span>Twitter</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center gap-2 border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
          onClick={handleBiometricLogin}
        >
          <Fingerprint className="h-4 w-4" />
          <span>البصمة</span>
        </Button>
      </div>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        لا تملك حساباً؟{' '}
        <Link
          href="/login?view=register"
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          أنشئ حساباً جديداً
        </Link>
      </p>
    </form>
  );
}
