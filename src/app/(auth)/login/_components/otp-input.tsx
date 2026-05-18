'use client';

import { useRef } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function OTPInput({ value, onChange, disabled }: OTPInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (isNaN(Number(val))) return;

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

  return (
    <div className="flex justify-center gap-3" dir="ltr">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <m.input
          key={i}
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
            "w-12 h-16 text-center text-2xl font-black rounded-xl bg-white/5 border border-white/10 text-primary outline-none transition-all focus:border-primary/50 focus:bg-white/10 focus:ring-4 focus:ring-primary/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}
