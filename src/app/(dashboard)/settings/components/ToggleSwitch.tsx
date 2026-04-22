'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
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
  sm: 'w-9 h-5',
  md: 'w-11 h-6',
  lg: 'w-14 h-7',
};

const thumbSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const thumbPositions = {
  sm: { enabled: 'calc(100% - 16px)', disabled: '4px' },
  md: { enabled: 'calc(100% - 20px)', disabled: '4px' },
  lg: { enabled: 'calc(100% - 24px)', disabled: '4px' },
};

export const ToggleSwitch = memo(function ToggleSwitch({
  enabled,
  onToggle,
  disabled = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: ToggleSwitchProps) {
  const handleClick = () => {
    if (!disabled) {
      onToggle(!enabled);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'relative rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
        enabled ? 'bg-indigo-500' : 'bg-slate-600',
        disabled && 'opacity-50 cursor-not-allowed',
        sizeClasses[size],
        className
      )}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'absolute top-1 rounded-full bg-white shadow-lg',
          thumbSizes[size]
        )}
        style={{
          left: enabled ? thumbPositions[size].enabled : thumbPositions[size].disabled,
        }}
      />
    </button>
  );
});

