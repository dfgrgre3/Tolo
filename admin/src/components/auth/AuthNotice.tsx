'use client';

import React from 'react';
import { m } from "framer-motion";
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthNoticeProps {
  type: 'error' | 'success';
  message: string;
  className?: string;
}

export function AuthNotice({ type, message, className }: AuthNoticeProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold',
        type === 'error'
          ? 'border-red-500/30 bg-red-500/10 text-red-400'
          : 'border-green-500/30 bg-green-500/10 text-emerald-400',
        className
      )}
    >
      {type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
      <p>{message}</p>
    </m.div>
  );
}
