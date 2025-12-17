'use client';

/**
 * Security Score Card
 * Displays account security score with recommendations for improvement
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Smartphone,
  Mail,
  Eye,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

// ==================== TYPES ====================

interface SecurityFactor {
  id: string;
  name: string;
  description: string;
  weight: number;
  enabled: boolean;
  icon: React.ReactNode;
  action?: string;
  actionUrl?: string;
}

interface SecurityScoreCardProps {
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  hasSecurityKeys?: boolean;
  hasBiometric?: boolean;
  hasStrongPassword?: boolean;
  lastPasswordChange?: Date;
  onImprove?: (factorId: string) => void;
}

// ==================== COMPONENT ====================

export function SecurityScoreCard({
  twoFactorEnabled = false,
  emailVerified = false,
  hasSecurityKeys = false,
  hasBiometric = false,
  hasStrongPassword = true,
  lastPasswordChange,
  onImprove,
}: SecurityScoreCardProps) {
  const [score, setScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Define security factors with weights
  const factors: SecurityFactor[] = [
    {
      id: 'email_verified',
      name: 'البريد الإلكتروني موثق',
      description: 'تأكيد البريد الإلكتروني يحمي حسابك',
      weight: 20,
      enabled: emailVerified,
      icon: <Mail className="h-4 w-4" />,
      action: 'توثيق البريد',
      actionUrl: '/settings/email-verification',
    },
    {
      id: 'two_factor',
      name: 'التحقق بخطوتين',
      description: 'طبقة حماية إضافية عند تسجيل الدخول',
      weight: 30,
      enabled: twoFactorEnabled,
      icon: <Smartphone className="h-4 w-4" />,
      action: 'تفعيل',
      actionUrl: '/settings/security/2fa',
    },
    {
      id: 'strong_password',
      name: 'كلمة مرور قوية',
      description: 'كلمة مرور تحتوي على أحرف وأرقام ورموز',
      weight: 20,
      enabled: hasStrongPassword,
      icon: <Lock className="h-4 w-4" />,
      action: 'تحديث',
      actionUrl: '/settings/security/password',
    },
    {
      id: 'security_keys',
      name: 'مفاتيح الأمان',
      description: 'استخدام YubiKey أو مفتاح أجهزة مماثل',
      weight: 20,
      enabled: hasSecurityKeys,
      icon: <Key className="h-4 w-4" />,
      action: 'إضافة',
      actionUrl: '/settings/security/keys',
    },
    {
      id: 'biometric',
      name: 'المصادقة البيومترية',
      description: 'استخدام بصمة الإصبع أو الوجه',
      weight: 10,
      enabled: hasBiometric,
      icon: <Eye className="h-4 w-4" />,
      action: 'تفعيل',
      actionUrl: '/settings/security/biometric',
    },
  ];

  // Calculate score
  useEffect(() => {
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const enabledWeight = factors
      .filter((f) => f.enabled)
      .reduce((sum, f) => sum + f.weight, 0);
    const calculatedScore = Math.round((enabledWeight / totalWeight) * 100);

    // Animate score
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setScore(calculatedScore);
      setIsAnimating(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [twoFactorEnabled, emailVerified, hasSecurityKeys, hasBiometric, hasStrongPassword]);

  // Get score level
  const getScoreLevel = () => {
    if (score >= 80) return { level: 'excellent', color: 'emerald', label: 'ممتاز' };
    if (score >= 60) return { level: 'good', color: 'green', label: 'جيد' };
    if (score >= 40) return { level: 'fair', color: 'amber', label: 'متوسط' };
    return { level: 'poor', color: 'red', label: 'ضعيف' };
  };

  const scoreLevel = getScoreLevel();
  const enabledCount = factors.filter((f) => f.enabled).length;
  const disabledFactors = factors.filter((f) => !f.enabled);

  // Score color classes
  const scoreColors = {
    excellent: 'from-emerald-500 to-green-500',
    good: 'from-green-500 to-lime-500',
    fair: 'from-amber-500 to-yellow-500',
    poor: 'from-red-500 to-orange-500',
  };

  const scoreRingColors = {
    excellent: 'stroke-emerald-500',
    good: 'stroke-green-500',
    fair: 'stroke-amber-500',
    poor: 'stroke-red-500',
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6">
      {/* Header with Score Circle */}
      <div className="flex items-center gap-6">
        {/* Circular Score */}
        <div className="relative">
          <svg width="100" height="100" className="-rotate-90">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-white/10"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={scoreRingColors[scoreLevel.level as keyof typeof scoreRingColors]}
              initial={{ strokeDasharray: '0 251.2' }}
              animate={{
                strokeDasharray: `${(score / 100) * 251.2} 251.2`,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-2xl font-bold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {score}%
            </motion.span>
          </div>
        </div>

        {/* Score Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {score >= 60 ? (
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-amber-400" />
            )}
            <h3 className="text-lg font-semibold text-white">نقاط الأمان</h3>
          </div>
          <div
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-gradient-to-r ${scoreColors[scoreLevel.level as keyof typeof scoreColors]} text-white`}
          >
            {scoreLevel.label}
          </div>
          <p className="text-sm text-slate-400 mt-2">
            {enabledCount} من {factors.length} ميزات أمان مفعّلة
          </p>
        </div>
      </div>

      {/* Enabled Factors */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">الميزات المفعّلة</p>
        <div className="flex flex-wrap gap-2">
          {factors
            .filter((f) => f.enabled)
            .map((factor) => (
              <div
                key={factor.id}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {factor.name}
              </div>
            ))}
          {enabledCount === 0 && (
            <p className="text-sm text-slate-500">لا توجد ميزات مفعّلة</p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {disabledFactors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-300">توصيات لتحسين الأمان</p>
          </div>
          <div className="space-y-2">
            {disabledFactors.slice(0, 3).map((factor) => (
              <motion.button
                key={factor.id}
                whileHover={{ scale: 1.01, x: 4 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onImprove?.(factor.id)}
                className="w-full flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3 text-right hover:bg-white/10 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-400">
                    {factor.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{factor.name}</p>
                    <p className="text-xs text-slate-400">{factor.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-indigo-300 opacity-0 group-hover:opacity-100 transition">
                  {factor.action}
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Password Age Warning */}
      {lastPasswordChange && (
        (() => {
          const daysSinceChange = Math.floor(
            (Date.now() - lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceChange > 90) {
            return (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">
                      مر {daysSinceChange} يوماً منذ تغيير كلمة المرور
                    </p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      نوصي بتغيير كلمة المرور كل 90 يوماً
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()
      )}

      {/* Perfect Score Celebration */}
      {score === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 p-4 text-center"
        >
          <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
          <p className="text-emerald-300 font-medium">حسابك محمي بالكامل! 🎉</p>
          <p className="text-xs text-emerald-300/70 mt-1">
            لقد قمت بتفعيل جميع ميزات الأمان المتاحة
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default SecurityScoreCard;
