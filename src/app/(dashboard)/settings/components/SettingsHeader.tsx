'use client';


import { motion } from 'framer-motion';
import { LucideIcon, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function SettingsHeader({
  icon: Icon,
  title,
  description,
  actionButton,
  className
}: SettingsHeaderProps) {
  const variantClasses = {
    primary: 'bg-green-500 hover:bg-green-600 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
  };

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Icon className="h-7 w-7 text-indigo-400" />
          {title}
        </h1>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
      </div>

      {actionButton &&
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={actionButton.onClick}
        disabled={actionButton.loading}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50',
          variantClasses[actionButton.variant || 'primary']
        )}>
        
          {actionButton.loading ?
        <Loader2 className="h-4 w-4 animate-spin" /> :
        actionButton.icon ?
        <actionButton.icon className="h-4 w-4" /> :

        <Check className="h-4 w-4" />
        }
          {actionButton.label}
        </motion.button>
      }
    </div>);

}