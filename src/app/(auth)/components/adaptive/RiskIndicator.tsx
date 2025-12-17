'use client';

/**
 * 🎯 RiskIndicator - مؤشر مستوى المخاطر
 * 
 * يعرض مستوى المخاطر بشكل مرئي
 */

import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskLevel, RiskReason } from '@/lib/security/adaptive/types';

interface RiskIndicatorProps {
  level: RiskLevel;
  score?: number;
  reasons?: RiskReason[];
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const riskConfig: Record<RiskLevel, {
  icon: typeof Shield;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  labelAr: string;
}> = {
  low: {
    icon: ShieldCheck,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'Low Risk',
    labelAr: 'مخاطر منخفضة',
  },
  medium: {
    icon: Shield,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Medium Risk',
    labelAr: 'مخاطر متوسطة',
  },
  high: {
    icon: ShieldAlert,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    label: 'High Risk',
    labelAr: 'مخاطر عالية',
  },
  critical: {
    icon: ShieldX,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Critical Risk',
    labelAr: 'مخاطر حرجة',
  },
};

const sizeConfig = {
  sm: {
    icon: 'h-4 w-4',
    text: 'text-xs',
    padding: 'px-2 py-1',
  },
  md: {
    icon: 'h-5 w-5',
    text: 'text-sm',
    padding: 'px-3 py-1.5',
  },
  lg: {
    icon: 'h-6 w-6',
    text: 'text-base',
    padding: 'px-4 py-2',
  },
};

export function RiskIndicator({
  level,
  score,
  reasons = [],
  showDetails = false,
  size = 'md',
  className,
}: RiskIndicatorProps) {
  const config = riskConfig[level];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border',
          config.bgColor,
          config.borderColor,
          sizeStyles.padding
        )}
      >
        <Icon className={cn(sizeStyles.icon, config.color)} />
        <span className={cn(sizeStyles.text, 'font-medium', config.color)}>
          {config.labelAr}
        </span>
        {score !== undefined && (
          <span className={cn(sizeStyles.text, 'text-muted-foreground')}>
            ({score}%)
          </span>
        )}
      </motion.div>

      {/* Details */}
      {showDetails && reasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={cn(
            'rounded-lg border p-3 space-y-2',
            config.bgColor,
            config.borderColor
          )}
        >
          <div className="flex items-center gap-2">
            <Info className={cn('h-4 w-4', config.color)} />
            <span className="text-sm font-medium">أسباب المخاطر:</span>
          </div>
          <ul className="space-y-1 mr-6">
            {reasons.map((reason, index) => (
              <li
                key={reason.code}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{reason.messageAr}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Risk Score Circle - دائرة درجة المخاطر
 */
interface RiskScoreCircleProps {
  score: number;
  size?: number;
  className?: string;
}

export function RiskScoreCircle({
  score,
  size = 80,
  className,
}: RiskScoreCircleProps) {
  const getColor = () => {
    if (score >= 80) return '#ef4444'; // red
    if (score >= 50) return '#f97316'; // orange
    if (score >= 30) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  return (
    <div className={cn('relative inline-flex', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-bold text-lg"
          style={{ color: getColor() }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

export default RiskIndicator;
