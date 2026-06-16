'use client';

import { m } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Phone, Calendar, ArrowRight } from 'lucide-react';
import { type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { PremiumInput } from '@/components/auth/premium-input';
import { Button } from '@/components/ui/button';
import { PasswordStrengthMeter } from './password-strength-meter';
import { cn } from '@/lib/utils';

interface PersonalInfoStepProps {
  readonly register: UseFormRegister<any>;
  readonly errors: FieldErrors<any>;
  readonly showPassword: boolean;
  readonly setShowPassword: (v: boolean) => void;
  readonly showConfirmPassword: boolean;
  readonly setShowConfirmPassword: (v: boolean) => void;
  readonly handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly passwordValue: string;
  readonly onNext: () => void;
  readonly onBack?: () => void;
}

export function PersonalInfoStep({
  register, errors, showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword,
  handlePhoneChange, passwordValue, onNext, onBack
}: PersonalInfoStepProps) {
  return (
    <m.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
        <PremiumInput registration={register('username')} label="اسم المستخدم" icon={<User size={20} />} error={errors.username?.message} />
        <PremiumInput registration={register('email')} type="email" label="البريد الإلكتروني" icon={<Mail size={20} />} error={errors.email?.message} />

        <div className="space-y-3">
          <PremiumInput
            registration={register('password')}
            type={showPassword ? 'text' : 'password'}
            label="كلمة المرور"
            icon={<Lock size={20} />}
            endAdornment={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-gray-500 hover:text-white transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            error={errors.password?.message}
          />
          <PasswordStrengthMeter passwordValue={passwordValue} />
        </div>

        <PremiumInput
          registration={register('confirmPassword')}
          type={showConfirmPassword ? 'text' : 'password'}
          label="تأكيد كلمة المرور"
          icon={<Lock size={20} />}
          endAdornment={
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="p-2 text-gray-500 hover:text-white transition-colors">
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          error={errors.confirmPassword?.message}
        />

        <PremiumInput
          registration={{
            ...register('phone'),
            onChange: async (e) => {
              handlePhoneChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
              return register('phone').onChange(e);
            }
          }}
          label="رقم الهاتف"
          icon={<Phone size={20} />}
          error={errors.phone?.message}
        />
        <PremiumInput registration={register('dateOfBirth')} type="date" label="تاريخ الميلاد" icon={<Calendar size={20} />} error={errors.dateOfBirth?.message} />
      </div>

      <div className="flex gap-6 pt-6">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack} className="h-18 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white text-lg hover:bg-white/10 transition-colors">سابـق</Button>
        )}
        <Button type="button" onClick={onNext} className={cn("h-18 rounded-2xl bg-primary font-black text-black text-lg shadow-xl shadow-primary/10 group overflow-hidden relative", onBack ? "flex-[2]" : "w-full")}>
          <m.div className="absolute inset-0 bg-white/20" initial={{ y: "100%" }} whileHover={{ y: 0 }} transition={{ duration: 0.3 }} />
          <div className="relative z-10 flex items-center justify-center gap-3">تأكيد البيانات <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" /></div>
        </Button>
      </div>
    </m.div>
  );
}
