'use client';

import { LucideIcon, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SettingsHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: LucideIcon;
  };
  className?: string;
}

const actionVariantMap = {
  primary: 'default',
  secondary: 'secondary',
  danger: 'destructive',
} as const;

export function SettingsHeader({
  icon: Icon,
  title,
  description,
  actionButton,
  className
}: SettingsHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Icon className="h-7 w-7 text-primary" />
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {actionButton && (
        <Button
          variant={actionVariantMap[actionButton.variant || 'primary']}
          onClick={actionButton.onClick}
          disabled={actionButton.loading}
        >
          {actionButton.loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : actionButton.icon ? (
            <actionButton.icon className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {actionButton.label}
        </Button>
      )}
    </div>
  );
}
