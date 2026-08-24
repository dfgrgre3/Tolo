'use client';

import { memo } from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

const sizeClasses = {
  sm: 'h-[18px] w-8',
  md: '', // matches Switch's own default size
  lg: 'h-7 w-14',
};

const thumbSizeClasses = {
  sm: '[&>span]:h-3.5 [&>span]:w-3.5',
  md: '',
  lg: '[&>span]:h-6 [&>span]:w-6',
};

/**
 * Thin wrapper around the real ui/switch.tsx (Radix Switch) that preserves
 * the enabled/onToggle prop API used across the settings section, so call
 * sites don't need to change while the visuals now come from the app's
 * real token-based Switch instead of a hand-rolled indigo/slate toggle.
 */
export const ToggleSwitch = memo(function ToggleSwitch({
  enabled,
  onToggle,
  disabled = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: ToggleSwitchProps) {
  return (
    <Switch
      checked={enabled}
      onCheckedChange={onToggle}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(sizeClasses[size], thumbSizeClasses[size], className)}
    />
  );
});
