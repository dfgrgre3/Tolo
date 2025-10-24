import type { FormEvent } from 'react';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { Button } from '@/shared/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CredentialsState, LoginFormErrors } from './types';

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
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-200"
        >
          �?�?�?�?�?�? �?�?�?�?�?�?�?�?�?�?
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
          �?�?�?�? �?�?�?�?�?�?
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
          �?�?�?�? �?�?�?�? �?�?�?�?�?�?�?
        </button>
        <label className="flex items-center gap-2">
          <span>�?���?�?�?�?</span>
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
            �?�?�?�? �?�?�?�?�?�?...
          </span>
        ) : (
          '�?�?�?�?�? �?�?�?�?�?�?'
        )}
      </Button>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
        ��? �?�?�?�? �?�?�?�?�?�? �?�?�?
        <span className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          type="button"
          variant="outline"
          className="border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
          onClick={() => onSocialLogin('google')}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
          onClick={() => onSocialLogin('github')}
        >
          GitHub
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
          onClick={() => onSocialLogin('twitter')}
        >
          Twitter
        </Button>
      </div>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        لا تملك حساباً؟{' '}
        <Link
          href="/register"
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          أنشئ حساباً جديداً
        </Link>
      </p>
    </form>
  );
}
