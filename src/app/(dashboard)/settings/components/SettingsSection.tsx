'use client';

import { ReactNode, memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const SettingsSection = memo(function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  className,
  delay = 0,
}: SettingsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'rounded-2xl bg-white/5 border border-white/10 overflow-hidden',
        className
      )}
    >
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
            <Icon className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
});

