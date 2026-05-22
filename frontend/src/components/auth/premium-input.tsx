'use client';

import React, { useState, type ReactNode } from 'react';
import { type UseFormRegisterReturn } from 'react-hook-form';
import { m, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumInputProps {
  label: string;
  icon: ReactNode | React.ElementType;
  error?: { message?: string } | string;
  type?: string;
  registration: UseFormRegisterReturn;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
  endAdornment?: ReactNode;
  dir?: 'rtl' | 'ltr';
}

export function PremiumInput({
  label,
  icon: Icon,
  error,
  type = "text",
  registration,
  showPasswordToggle,
  onTogglePassword,
  showPassword,
  endAdornment,
  dir,
}: PremiumInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  const isActive = isFocused || hasValue;
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const PasswordToggleIcon = showPassword ? EyeOff : Eye;

  return (
    <div className="space-y-2 group/input" dir={dir}>
      <m.div
        animate={{
          borderColor: isFocused ? "rgba(255,109,0,0.5)" : errorMessage ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)",
          backgroundColor: isFocused ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "relative border rounded-[1.5rem] overflow-hidden transition-shadow duration-300 backdrop-blur-sm",
          isFocused && "shadow-[0_0_25px_rgba(255,109,0,0.15)]",
          errorMessage && "ring-2 ring-red-500/20"
        )}
      >
        <div className={cn(
          "absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-300 z-10",
          isFocused ? "text-primary scale-110" : errorMessage ? "text-red-400" : "text-gray-500"
        )}>
          {typeof Icon === 'function' ? React.createElement(Icon as React.ElementType, { size: 22, strokeWidth: 2.5 }) : Icon}
        </div>

        <input
          {...registration}
          type={type}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            setHasValue(!!e.target.value);
            registration.onBlur(e);
          }}
          onChange={(e) => {
            registration.onChange(e);
            setHasValue(!!e.target.value);
          }}
          placeholder=" "
          className="peer w-full h-16 pr-14 pl-6 text-white text-base font-bold outline-none bg-transparent relative z-0"
        />

        <m.label
          animate={{
            y: isActive ? -18 : 0,
            scale: isActive ? 0.75 : 1,
            x: isActive ? 10 : 0,
            color: isFocused ? "rgba(255,109,0,0.9)" : errorMessage ? "rgba(239,68,68,1)" : "rgba(107,114,128,1)",
          }}
          className={cn(
            "absolute right-14 top-1/2 -translate-y-1/2 font-bold pointer-events-none origin-right transition-all z-10",
            isActive ? "text-[10px]" : "text-sm"
          )}
        >
          {label}
        </m.label>

        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-2.5 z-20"
          >
            <PasswordToggleIcon size={20} />
          </button>
        )}

        {endAdornment && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {endAdornment}
          </div>
        )}
      </m.div>
      <AnimatePresence>
        {errorMessage && (
          <m.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 px-3 overflow-hidden"
          >
            <ShieldAlert size={12} className="text-red-500 shrink-0" />
            <p className="text-[11px] font-black text-red-400 uppercase tracking-tight">
              {errorMessage}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
