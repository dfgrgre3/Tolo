'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { type UseFormRegisterReturn } from 'react-hook-form';
import { PremiumInput } from '@/components/auth/premium-input';

interface PasswordInputProps {
  readonly showPassword: boolean;
  readonly setShowPassword: (v: boolean) => void;
  readonly registration: UseFormRegisterReturn;
  readonly error?: { readonly message?: string };
}

export function PasswordInput({ showPassword, setShowPassword, registration, error }: PasswordInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">كلمة المرور</span>
        <Link
          href="/forgot-password"
          className="text-[11px] font-black text-primary/70 hover:text-primary transition-colors"
        >
          نسيت كلمة السر؟
        </Link>
      </div>
      <PremiumInput
        label="كلمة المرور"
        type={showPassword ? 'text' : 'password'}
        icon={<Lock size={22} strokeWidth={2.5} />}
        registration={registration}
        error={error}
        showPasswordToggle
        onTogglePassword={() => setShowPassword(!showPassword)}
        showPassword={showPassword}
        autoComplete="current-password"
      />
    </div>
  );
}
