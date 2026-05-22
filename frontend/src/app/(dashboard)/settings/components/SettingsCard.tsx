'use client';

import { ReactNode } from 'react';
import { m } from "framer-motion";
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  gradient?: boolean;
}

export function SettingsCard({
  children,
  className,
  delay = 0,
  gradient = false,
}: SettingsCardProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'rounded-2xl border overflow-hidden',
        gradient
          ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30'
          : 'bg-white/5 border-white/10',
        className
      )}
    >
      {children}
    </m.div>
  );
}

