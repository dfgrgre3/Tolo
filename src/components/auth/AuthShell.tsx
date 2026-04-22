'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  children: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  icon?: React.ReactNode;
  accent?: 'default' | 'danger';
  footer?: React.ReactNode;
  className?: string;
}

export function AuthShell({
  children,
  title,
  description,
  icon,
  accent = 'default',
  footer,
  className,
}: AuthShellProps) {
  const accentStyles = accent === 'danger'
    ? 'border-red-500/20 bg-gray-950/65 shadow-[0_32px_64px_-16px_rgba(127,29,29,0.35)]'
    : 'border-white/10 bg-black/40 shadow-[0_0_50px_rgba(0,0,0,0.5)]';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-[3rem] p-10 md:p-12 backdrop-blur-3xl ring-1 ring-white/5',
        accentStyles,
        className
      )}
    >
      <div className="mb-10 text-center space-y-4">
        {icon && (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            {icon}
          </div>
        )}
        <h2 className="text-4xl font-black tracking-tight text-white">{title}</h2>
        <p className="text-gray-500 font-medium">{description}</p>
      </div>

      <div className="space-y-8">{children}</div>

      {footer ? <div className="mt-12">{footer}</div> : null}
    </motion.div>
  );
}
