'use client';

import { ReactNode, memo } from 'react';
import { m } from "framer-motion";
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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'rounded-2xl bg-card/60 border border-border backdrop-blur-md overflow-hidden',
        className
      )}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </m.div>
  );
});
