'use client';

/**
 * Advanced Security Dashboard
 * Comprehensive security overview and management
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Globe,
  Lock,
  Key,
  Smartphone,
  Eye,
  Download,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLoginAttemptTracker } from '../analytics/LoginAttemptTracker';
import { getSecurityNotificationSystem } from '../notifications/SecurityNotificationSystem';
import { getAdvancedSessionManager } from '../sessions/AdvancedSessionManager';
import { getSmartRateLimiter } from '../security/SmartRateLimiter';
import { logger } from '@/lib/logger';

interface SecurityMetrics {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  activeSessions: number;
  recentAttempts: number;
  successRate: number;
  trustScore: number;
  notifications: number;
  twoFactorEnabled: boolean;
  passkeyEnabled: boolean;
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    overallScore: 0,
    riskLevel: 'low',
    activeSessions: 0,
    recentAttempts: 0,
    successRate: 0,
    trustScore: 0,
    notifications: 0,
    twoFactorEnabled: false,
    passkeyEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);

  const loginTracker = getLoginAttemptTracker();
  const notificationSystem = getSecurityNotificationSystem();
  const sessionManager = getAdvancedSessionManager();
  const rateLimiter = getSmartRateLimiter();

  useEffect(() => {
    loadMetrics();
  }, [selectedPeriod]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      // Get analytics
      const analytics = loginTracker.getGlobalAnalytics(selectedPeriod);
      
      // Get session statistics
      const sessionStats = sessionManager.getStatistics();
      
      // Get notifications
      const unreadNotifications = notificationSystem.getUnreadCount();
      
      // Calculate overall security score
      const overallScore = calculateSecurityScore(analytics, sessionStats);
      
      // Determine risk level
      const riskLevel = determineRiskLevel(overallScore, analytics);

      setMetrics({
        overallScore,
        riskLevel,
        activeSessions: sessionStats.activeSessions,
        recentAttempts: analytics.totalAttempts,
        successRate: analytics.successRate,
        trustScore: 75, // This would come from the rate limiter
        notifications: unreadNotifications,
        twoFactorEnabled: true, // This would come from user settings
        passkeyEnabled: false, // This would come from user settings
      });
    } catch (error) {
      logger.error('Failed to load security metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSecurityScore = (analytics: import('../analytics/LoginAttemptTracker').LoginAnalytics, sessionStats: { activeSessions: number; trustedSessions: number }): number => {
    let score = 0;

    // Success rate (30 points)
    score += (analytics.successRate / 100) * 30;

    // Active sessions (20 points) - fewer is better
    const sessionScore = Math.max(0, 20 - sessionStats.activeSessions * 2);
    score += sessionScore;

    // Trusted sessions (20 points)
    const trustedRatio = sessionStats.activeSessions > 0
      ? sessionStats.trustedSessions / sessionStats.activeSessions
      : 0;
    score += trustedRatio * 20;

    // 2FA enabled (15 points)
    if (metrics.twoFactorEnabled) score += 15;

    // Passkey enabled (15 points)
    if (metrics.passkeyEnabled) score += 15;

    return Math.round(Math.min(100, score));
  };

  const determineRiskLevel = (score: number, analytics: import('../analytics/LoginAttemptTracker').LoginAnalytics): 'low' | 'medium' | 'high' | 'critical' => {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'high':
        return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'critical':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const getRiskLevelLabel = (level: string) => {
    switch (level) {
      case 'low':
        return 'منخفض';
      case 'medium':
        return 'متوسط';
      case 'high':
        return 'عالي';
      case 'critical':
        return 'حرج';
      default:
        return 'غير معروف';
    }
  };

  const exportSecurityReport = () => {
    const analytics = loginTracker.getGlobalAnalytics(selectedPeriod);
    const report = loginTracker.exportData('json');
    
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="h-8 w-8 text-indigo-400" />
            لوحة التحكم الأمنية
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            نظرة شاملة على أمان حسابك
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value) as 7 | 30 | 90)}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value={7}>آخر 7 أيام</option>
            <option value={30}>آخر 30 يوم</option>
            <option value={90}>آخر 90 يوم</option>
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadMetrics}
            className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <RefreshCw className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportSecurityReport}
            className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            <Download className="h-4 w-4" />
            تصدير التقرير
          </motion.button>
        </div>
      </div>

      {/* Overall Security Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2">
              درجة الأمان الإجمالية
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-white">
                {metrics.overallScore}
                <span className="text-2xl text-slate-400">/100</span>
              </div>
              <div className={cn('rounded-full px-4 py-2 text-sm font-medium border', getRiskLevelColor(metrics.riskLevel))}>
                مستوى المخاطر: {getRiskLevelLabel(metrics.riskLevel)}
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {metrics.overallScore >= 80
                ? 'ممتاز! حسابك محمي بشكل جيد.'
                : metrics.overallScore >= 60
                ? 'جيد، ولكن يمكن تحسين الأمان.'
                : metrics.overallScore >= 40
                ? 'يحتاج إلى تحسين. يرجى اتخاذ إجراءات أمنية إضافية.'
                : 'تحذير! حسابك في خطر. يرجى تحسين الأمان فوراً.'}
            </p>
          </div>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeDasharray={`${(metrics.overallScore / 100) * 352} 352`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-12 w-12 text-indigo-400" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity className="h-6 w-6" />}
          label="الجلسات النشطة"
          value={metrics.activeSessions.toString()}
          trend={metrics.activeSessions > 3 ? 'up' : 'stable'}
          color="blue"
        />
        <MetricCard
          icon={<BarChart3 className="h-6 w-6" />}
          label="محاولات تسجيل الدخول"
          value={metrics.recentAttempts.toString()}
          trend="stable"
          color="purple"
        />
        <MetricCard
          icon={<CheckCircle className="h-6 w-6" />}
          label="معدل النجاح"
          value={`${metrics.successRate.toFixed(1)}%`}
          trend={metrics.successRate > 80 ? 'up' : 'down'}
          color="green"
        />
        <MetricCard
          icon={<AlertTriangle className="h-6 w-6" />}
          label="الإشعارات غير المقروءة"
          value={metrics.notifications.toString()}
          trend={metrics.notifications > 5 ? 'up' : 'stable'}
          color="orange"
        />
      </div>

      {/* Security Features Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SecurityFeatureCard
          icon={<Lock className="h-6 w-6" />}
          title="المصادقة الثنائية"
          enabled={metrics.twoFactorEnabled}
          description="حماية إضافية لحسابك"
        />
        <SecurityFeatureCard
          icon={<Key className="h-6 w-6" />}
          title="مفاتيح المرور"
          enabled={metrics.passkeyEnabled}
          description="تسجيل دخول بدون كلمة مرور"
        />
        <SecurityFeatureCard
          icon={<Smartphone className="h-6 w-6" />}
          title="الأجهزة الموثوقة"
          enabled={true}
          description={`${metrics.activeSessions} جهاز نشط`}
        />
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-indigo-400" />
          النشاط الأخير
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    تسجيل دخول ناجح
                  </p>
                  <p className="text-xs text-slate-400">
                    من Chrome على Windows • منذ {i} ساعة
                  </p>
                </div>
              </div>
              <Globe className="h-4 w-4 text-slate-500" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  color: 'blue' | 'purple' | 'green' | 'orange';
}

function MetricCard({ icon, label, value, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-white/5 border border-white/10 p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('rounded-lg p-2', colorClasses[color])}>{icon}</div>
        {trend !== 'stable' && (
          <div className={cn('flex items-center gap-1 text-xs', trend === 'up' ? 'text-green-400' : 'text-red-400')}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </motion.div>
  );
}

interface SecurityFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  enabled: boolean;
  description: string;
}

function SecurityFeatureCard({ icon, title, enabled, description }: SecurityFeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-white/5 border border-white/10 p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('rounded-lg p-2', enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400')}>
          {icon}
        </div>
        <div className={cn('rounded-full px-2 py-1 text-xs font-medium', enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400')}>
          {enabled ? 'مفعّل' : 'غير مفعّل'}
        </div>
      </div>
      <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
      <p className="text-xs text-slate-400">{description}</p>
    </motion.div>
  );
}

