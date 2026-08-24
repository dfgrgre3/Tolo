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
        'rounded-2xl border overflow-hidden backdrop-blur-md',
        gradient
          ? 'bg-gradient-to-br from-primary/15 to-accent/15 border-primary/30'
          : 'bg-card/60 border-border',
        className
      )}
    >
      {children}
    </m.div>
  );
}
