'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export function AuthField({ label, error, icon, endAdornment, className, ...props }: AuthFieldProps) {
  return (
    <div className="space-y-3">
      <label className="mr-1 text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</label>
      <div className="group relative">
        <input
          {...props}
          className={cn(
            'w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-white outline-none transition-all placeholder:text-gray-600 disabled:opacity-50',
            icon ? 'pr-12 pl-6' : 'px-6',
            endAdornment ? 'pl-14' : '',
            className
          )}
        />
        {icon ? <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-primary">{icon}</div> : null}
        {endAdornment ? <div className="absolute left-4 top-1/2 -translate-y-1/2">{endAdornment}</div> : null}
      </div>
      {error ? <p className="mr-1 text-xs font-bold text-red-500/90 tracking-wide">{error}</p> : null}
    </div>
  );
}
