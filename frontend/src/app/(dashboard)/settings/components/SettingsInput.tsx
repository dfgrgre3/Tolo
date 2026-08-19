'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

const SettingsInput = forwardRef<HTMLInputElement, SettingsInputProps>(
  ({ label, icon: Icon, hint, error, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('space-y-2', containerClassName)}>
        <label className="text-sm font-medium text-muted-foreground block">
          {label}
        </label>
        <div className="relative">
          {Icon && (
            <Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          )}
          <input
            ref={ref}
            {...props}
            className={cn(
              'w-full pr-11 pl-4 py-3 rounded-xl bg-background border text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              error
                ? 'border-destructive/50 focus:border-destructive/50 focus:ring-destructive/50'
                : 'border-input',
              props.className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
          />
        </div>
        {hint && !error && (
          <p id={`${props.id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${props.id}-error`} className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

SettingsInput.displayName = 'SettingsInput';

