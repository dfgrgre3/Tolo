'use client';

import { useRef } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  readonly value: string;
  readonly onChange: (val: string) => void;
  readonly disabled?: boolean;
}

export function OTPInput({ value, onChange, disabled }: OTPInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (Number.isNaN(Number(val))) return;

    const newOTP = value.split('');
    newOTP[index] = val.substring(val.length - 1);
    const updatedValue = newOTP.join('');
    onChange(updatedValue);

    if (val && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Only accept 6-digit numeric codes

    onChange(pastedData);
    // Focus the last input
    inputs.current[5]?.focus();
  };

  return (
    <div className="flex justify-center gap-3" dir="ltr" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <m.input
          key={`otp-slot-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={cn(
            "w-12 h-16 text-center text-2xl font-black rounded-xl bg-muted/40 border border-border text-primary outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-4 focus:ring-primary/20 dark:bg-white/5 dark:border-white/10 dark:focus:bg-white/10",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}
