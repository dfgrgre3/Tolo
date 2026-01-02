import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  RegistrationFormErrors,
  RegistrationProfileState,
} from './types';

interface RegistrationAccountStepProps {
  profile: RegistrationProfileState;
  errors: RegistrationFormErrors;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof RegistrationProfileState, value: string) => void;
}

export function RegistrationAccountStep({
  profile,
  errors,
  isSubmitting,
  onSubmit,
  onChange,
}: RegistrationAccountStepProps) {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label
          htmlFor="full-name"
          className="flex items-center justify-end gap-2 text-sm text-muted-foreground"
        >
          الاسم الكامل
          <User className="h-4 w-4 text-primary" />
        </Label>
        <Input
          id="full-name"
          type="text"
          placeholder="الاسم كما سيظهر في الحساب"
          value={profile.fullName}
          onChange={(event) => onChange('fullName', event.target.value)}
          required
          className={cn(
            'text-right',
            errors.fullName
              ? 'border-destructive focus-visible:ring-destructive focus-visible:ring-offset-0'
              : '',
          )}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? 'register-fullname-error' : undefined}
        />
        {errors.fullName && (
          <p
            id="register-fullname-error"
            className="text-xs font-medium text-destructive text-right"
          >
            {errors.fullName}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="register-email"
          className="flex items-center justify-end gap-2 text-sm text-muted-foreground"
        >
          البريد الإلكتروني
          <Mail className="h-4 w-4 text-primary" />
        </Label>
        <Input
          id="register-email"
          type="email"
          placeholder="example@student.com"
          dir="ltr"
          value={profile.email}
          onChange={(event) => onChange('email', event.target.value)}
          required
          className={cn(
            'text-right',
            errors.email
              ? 'border-destructive focus-visible:ring-destructive focus-visible:ring-offset-0'
              : '',
          )}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'register-email-error' : undefined}
        />
        {errors.email && (
          <p
            id="register-email-error"
            className="text-xs font-medium text-destructive text-right"
          >
            {errors.email}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        المتابعة إلى الحماية
      </Button>
    </form>
  );
}
