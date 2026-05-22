'use client';

import { useMemo } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

export function PasswordStrengthMeter({ passwordValue }: { readonly passwordValue: string }) {
  const strengthData = useMemo(() => {
    if (!passwordValue) return null;
    let score = 0;
    if (passwordValue.length >= 8) score++;
    if (/[A-Z]/.test(passwordValue)) score++;
    if (/\d/.test(passwordValue)) score++;
    if (/[^A-Za-z\d]/.test(passwordValue)) score++;
    const colors = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    const texts = ['ضعيفة', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية جداً'];
    return { strength: score * 25, color: colors[score], text: texts[score] };
  }, [passwordValue]);

  if (!strengthData) return null;

  return (
    <div className="px-2 space-y-2">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
        <span className="text-gray-500">قوة التشفير</span>
        <span className={cn(strengthData.strength > 50 ? "text-primary" : "text-red-500")}>{strengthData.text}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${strengthData.strength}%` }}
          className={cn("h-full transition-all duration-500", strengthData.color)}
        />
      </div>
    </div>
  );
}
