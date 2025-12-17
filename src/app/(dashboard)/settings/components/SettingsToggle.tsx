'use client';

import { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToggleSwitch } from './ToggleSwitch';

interface SettingsToggleProps {
  icon: LucideIcon;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const SettingsToggle = memo(function SettingsToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  disabled = false,
  className,
}: SettingsToggleProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
            enabled
              ? 'bg-indigo-500/20 text-indigo-400'
              : 'bg-white/5 text-slate-400'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white">{title}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      <ToggleSwitch
        enabled={enabled}
        onToggle={onToggle}
        disabled={disabled}
        aria-label={`${title} - ${enabled ? 'مفعّل' : 'غير مفعّل'}`}
      />
    </div>
  );
});

