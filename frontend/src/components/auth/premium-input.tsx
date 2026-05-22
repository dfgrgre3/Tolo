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

function getErrorMessage(error?: { message?: string } | string): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  return error.message;
}

function getContainerAnimation(isFocused: boolean, errorMessage: string | undefined) {
  let borderColor = "rgba(255,255,255,0.08)";
  let backgroundColor = "rgba(255,255,255,0.04)";
  let scale = 1;

  if (isFocused) {
    borderColor = "rgba(255,109,0,0.5)";
    backgroundColor = "rgba(255,255,255,0.08)";
    scale = 1.01;
  } else if (errorMessage) {
    borderColor = "rgba(239,68,68,0.4)";
  }

  return { borderColor, backgroundColor, scale };
}

function getContainerClass(isFocused: boolean, hasError: boolean): string {
  return cn(
    "relative border rounded-[1.5rem] overflow-hidden transition-shadow duration-300 backdrop-blur-sm",
    isFocused && "shadow-[0_0_25px_rgba(255,109,0,0.15)]",
    hasError && "ring-2 ring-red-500/20"
  );
}

function getIconClass(isFocused: boolean, errorMessage: string | undefined): string {
  return cn(
    "absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-300 z-10",
    isFocused ? "text-primary scale-110" : errorMessage ? "text-red-400" : "text-gray-500"
  );
}

function renderIcon(Icon: ReactNode | React.ElementType) {
  if (typeof Icon === 'function') {
    return React.createElement(Icon as React.ElementType, { size: 22, strokeWidth: 2.5 });
  }
  return Icon;
}

function getLabelAnimation(isActive: boolean, isFocused: boolean, errorMessage: string | undefined) {
  let color = "rgba(107,114,128,1)";
  if (isFocused) {
    color = "rgba(255,109,0,0.9)";
  } else if (errorMessage) {
    color = "rgba(239,68,68,1)";
  }

  if (isActive) {
    return {
      y: -18,
      scale: 0.75,
      x: 10,
      color,
    };
  }

  return {
    y: 0,
    scale: 1,
    x: 0,
    color,
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
}: PremiumInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  const isActive = isFocused || hasValue;
  const errorMessage = getErrorMessage(error);
  const PasswordToggleIcon = showPassword ? EyeOff : Eye;

  const containerAnimation = getContainerAnimation(isFocused, errorMessage);
  const containerClass = getContainerClass(isFocused, !!errorMessage);
  const iconClass = getIconClass(isFocused, errorMessage);
  const labelAnimation = getLabelAnimation(isActive, isFocused, errorMessage);
  const labelClass = getLabelClass(isActive);

  return (
    <div className="space-y-2 group/input" dir={dir}>
      <m.div
        animate={containerAnimation}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={containerClass}
      >
        <div className={iconClass}>
          {renderIcon(Icon)}
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
          animate={labelAnimation}
          className={labelClass}
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
