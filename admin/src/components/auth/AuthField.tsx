'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { m, AnimatePresence } from 'framer-motion';

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export function AuthField({ label, error, icon, endAdornment, className, ...props }: AuthFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

  // Sync state with props.value if it changes externally
  React.useEffect(() => {
    if (props.value !== undefined) {
      setHasValue(!!props.value);
    }
  }, [props.value]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(!!e.target.value);
    if (props.onBlur) props.onBlur(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value);
    if (props.onChange) props.onChange(e);
  };

  return (
    <div className="space-y-1">
      <div className={cn(
        "group relative transition-all duration-300",
        isFocused ? "scale-[1.02]" : "scale-100"
      )}>
        {/* Icon */}
        {icon && (
          <div className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-300 z-10",
            isFocused ? "text-primary" : "text-gray-500"
          )}>
            {icon}
          </div>
        )}
        
        <input
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder=" "
          className={cn(
            "peer w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-white text-base font-bold outline-none transition-all",
            "focus:border-primary/50 focus:bg-white/10 focus:ring-4 focus:ring-primary/10",
            icon ? 'pr-12 pl-6' : 'px-6',
            endAdornment ? 'pl-14' : '',
            error && "border-red-500/50 focus:border-red-500",
            className
          )}
        />
        
        {/* Floating Label */}
        <label className={cn(
          "absolute top-1/2 -translate-y-1/2 text-gray-500 font-bold transition-all pointer-events-none z-10",
          icon ? "right-12" : "right-6",
          (isFocused || hasValue) ? "text-[10px] -translate-y-[180%] text-primary/80" : "text-sm"
        )}>
          {label}
        </label>

        {/* End Adornment (e.g. Password Toggle) */}
        {endAdornment && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
            {endAdornment}
          </div>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-[10px] font-bold text-red-500 pr-2 pt-1 uppercase tracking-tight">
              {error}
            </p>
          </m.div>
        )}
      </AnimatePresence>


    </div>
  );
}
