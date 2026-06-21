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
  autoComplete?: string;
}

function getErrorMessage(error?: { message?: string } | string): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  return error.message;
}

function getContainerClass(isFocused: boolean, hasError: boolean): string {
  return cn(
    "relative border rounded-[1.5rem] overflow-hidden transition-all duration-300 backdrop-blur-sm",
    isFocused 
      ? "border-primary/50 bg-muted/60 scale-[1.01] shadow-[0_0_25px_rgba(255,109,0,0.15)]" 
      : hasError 
        ? "border-destructive/40 bg-muted/30 ring-2 ring-destructive/20" 
        : "border-border bg-muted/30"
  );
}

function getIconClass(isFocused: boolean, errorMessage: string | undefined): string {
  return cn(
    "absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-300 z-10",
    isFocused ? "text-primary scale-110" : errorMessage ? "text-destructive" : "text-muted-foreground"
  );
}

function renderIcon(Icon: ReactNode | React.ElementType) {
  if (typeof Icon === 'function') {
    return React.createElement(Icon as React.ElementType, { size: 22, strokeWidth: 2.5 });
  }
  return Icon;
}

function getLabelAnimation(isActive: boolean) {
  if (isActive) {
    return {
      y: -18,
      scale: 0.75,
      x: 10,
    };
  }

  return {
    y: 0,
    scale: 1,
    x: 0,
  };
}

function getLabelClass(isActive: boolean): string {
  return cn(
    "absolute right-14 top-1/2 -translate-y-1/2 font-bold pointer-events-none origin-right transition-all z-10",
    isActive ? "text-[10px]" : "text-sm"
  );
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
  autoComplete,
}: PremiumInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  const isActive = isFocused || hasValue;
  const errorMessage = getErrorMessage(error);
  const PasswordToggleIcon = showPassword ? EyeOff : Eye;

  const containerClass = getContainerClass(isFocused, !!errorMessage);
  const iconClass = getIconClass(isFocused, errorMessage);
  const labelAnimation = getLabelAnimation(isActive);
  const labelClass = getLabelClass(isActive);

  return (
    <div className="space-y-2 group/input" dir={dir}>
      <div
        className={containerClass}
      >
        <div className={iconClass}>
          {renderIcon(Icon)}
        </div>

        <input
          {...registration}
          type={type}
          autoComplete={autoComplete}
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
          className="peer w-full h-16 pr-14 pl-6 text-foreground text-base font-bold outline-none bg-transparent relative z-0"
        />

        <m.label
          animate={labelAnimation}
          className={cn(
            labelClass,
            isFocused ? "text-primary" : errorMessage ? "text-destructive" : "text-muted-foreground",
            "transition-colors duration-300"
          )}
        >
          {label}
        </m.label>

        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2.5 z-20"
          >
            <PasswordToggleIcon size={20} />
          </button>
        )}

        {endAdornment && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {endAdornment}
          </div>
        )}
      </div>
      <AnimatePresence>
        {errorMessage && (
          <m.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 px-3 overflow-hidden"
          >
            <ShieldAlert size={12} className="text-destructive shrink-0" />
            <p className="text-[11px] font-black text-destructive uppercase tracking-tight">
              {errorMessage}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
