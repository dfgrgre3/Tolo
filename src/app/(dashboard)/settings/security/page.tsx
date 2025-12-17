'use client';

/**
 * 🏰 صفحة مركز الأمان - Security Center
 * 
 * مركز أمان شامل مع:
 * - درجة الأمان
 * - التحقق بخطوتين
 * - مفاتيح المرور
 * - سجل النشاط الأمني
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Lock,
  Key,
  Fingerprint,
  Smartphone,
  Mail,
  Bell,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  FileKey,
  RefreshCw,
  TrendingUp,
  Settings,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: '2fa-app' | 'sms' | 'email' | null;
  passkeyEnabled: boolean;
  passkeyCount: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  backupCodesGenerated: boolean;
  backupCodesRemaining: number;
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
  passwordLastChanged: Date | null;
  passwordStrength: 'weak' | 'medium' | 'strong';
}

interface ActivityLog {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'settings_change' | 'security_alert' | '2fa_enabled';
  description: string;
  device: string;
  location: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'danger';
}

interface SecurityRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  actionLink: string;
  icon: typeof Shield;
  completed: boolean;
}

export default function SecurityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'activity'>('overview');
  const [securityScore, setSecurityScore] = useState(0);
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    twoFactorMethod: null,
    passkeyEnabled: false,
    passkeyCount: 0,
    emailVerified: false,
    phoneVerified: false,
    backupCodesGenerated: false,
    backupCodesRemaining: 0,
    loginNotifications: false,
    suspiciousActivityAlerts: false,
    passwordLastChanged: null,
    passwordStrength: 'weak',
  });
  const [recommendations, setRecommendations] = useState<SecurityRecommendation[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Calculate security score
  const calculateScore = useCallback((s: SecuritySettings): number => {
    let score = 20;
    if (s.twoFactorEnabled) score += 25;
    if (s.passkeyEnabled) score += 15;
    if (s.emailVerified) score += 10;
    if (s.phoneVerified) score += 5;
    if (s.backupCodesGenerated) score += 10;
    if (s.loginNotifications) score += 5;
    if (s.suspiciousActivityAlerts) score += 5;
    if (s.passwordStrength === 'strong') score += 5;
    else if (s.passwordStrength === 'medium') score += 2;
    return Math.min(100, score);
  }, []);

  // Generate recommendations
  const generateRecommendations = useCallback((s: SecuritySettings): SecurityRecommendation[] => {
    const recs: SecurityRecommendation[] = [];
    
    if (!s.twoFactorEnabled) {
      recs.push({
        id: '2fa',
        title: 'تفعيل التحقق بخطوتين',
        description: 'أضف طبقة حماية إضافية لحسابك',
        priority: 'critical',
        action: 'تفعيل الآن',
        actionLink: '#2fa',
        icon: Lock,
        completed: false,
      });
    }
    
    if (!s.emailVerified) {
      recs.push({
        id: 'email',
        title: 'تحقق من بريدك الإلكتروني',
        description: 'تأكيد ملكيتك للبريد الإلكتروني',
        priority: 'high',
        action: 'التحقق',
        actionLink: '#email',
        icon: Mail,
        completed: false,
      });
    }
    
    if (!s.backupCodesGenerated) {
      recs.push({
        id: 'backup',
        title: 'إنشاء أكواد احتياطية',
        description: 'للوصول لحسابك في حالة فقدان جهازك',
        priority: 'high',
        action: 'إنشاء',
        actionLink: '#backup',
        icon: FileKey,
        completed: false,
      });
    }
    
    if (!s.passkeyEnabled) {
      recs.push({
        id: 'passkey',
        title: 'إضافة Passkey',
        description: 'تسجيل دخول أسرع وأكثر أماناً',
        priority: 'medium',
        action: 'إضافة',
        actionLink: '#passkey',
        icon: Fingerprint,
        completed: false,
      });
    }
    
    if (s.passwordStrength !== 'strong') {
      recs.push({
        id: 'password',
        title: 'تقوية كلمة المرور',
        description: 'كلمة مرورك الحالية ضعيفة',
        priority: s.passwordStrength === 'weak' ? 'high' : 'medium',
        action: 'تغيير',
        actionLink: '#password',
        icon: Key,
        completed: false,
      });
    }
    
    return recs;
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockSettings: SecuritySettings = {
          twoFactorEnabled: true,
          twoFactorMethod: '2fa-app',
          passkeyEnabled: false,
          passkeyCount: 0,
          emailVerified: true,
          phoneVerified: false,
          backupCodesGenerated: true,
          backupCodesRemaining: 8,
          loginNotifications: true,
          suspiciousActivityAlerts: true,
          passwordLastChanged: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          passwordStrength: 'strong',
        };
        
        const mockLogs: ActivityLog[] = [
          {
            id: '1',
            type: 'login',
            description: 'تسجيل دخول ناجح',
            device: 'Chrome على Windows',
            location: 'القاهرة، مصر',
            timestamp: new Date(),
            status: 'success',
          },
          {
            id: '2',
            type: '2fa_enabled',
            description: 'تفعيل التحقق بخطوتين',
            device: 'Chrome على Windows',
            location: 'القاهرة، مصر',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            status: 'success',
          },
          {
            id: '3',
            type: 'security_alert',
            description: 'محاولة تسجيل دخول مشبوهة',
            device: 'متصفح غير معروف',
            location: 'موسكو، روسيا',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            status: 'danger',
          },
          {
            id: '4',
            type: 'password_change',
            description: 'تغيير كلمة المرور',
            device: 'Safari على iPhone',
            location: 'الرياض، السعودية',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            status: 'success',
          },
        ];
        
        setSettings(mockSettings);
        setSecurityScore(calculateScore(mockSettings));
        setRecommendations(generateRecommendations(mockSettings));
        setActivityLogs(mockLogs);
      } catch (error) {
        console.error('Failed to load security data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [calculateScore, generateRecommendations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const pendingRecommendations = recommendations.filter(r => !r.completed);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="h-7 w-7 text-indigo-400" />
            مركز الأمان
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            إدارة أمان حسابك وإعداداته
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex rounded-xl bg-white/5 p-1">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: Eye },
            { id: 'settings', label: 'الإعدادات', icon: Settings },
            { id: 'activity', label: 'النشاط', icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Security Score */}
            <div className="grid lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 text-center">
                  درجة الأمان
                </h3>
                <div className="flex justify-center mb-4">
                  <SecurityScoreCircle score={securityScore} />
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-300">
                    {securityScore >= 80
                      ? 'ممتاز! حسابك محمي بشكل جيد'
                      : securityScore >= 60
                      ? 'جيد، ولكن يمكن تحسينه'
                      : 'يحتاج إلى تحسين'}
                  </p>
                </div>
              </motion.div>

              {/* Recommendations */}
              <div className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-400" />
                    توصيات لتحسين الأمان
                  </h3>
                  {pendingRecommendations.length > 0 && (
                    <span className="px-2 py-1 text-xs rounded-full bg-indigo-500/20 text-indigo-400">
                      {pendingRecommendations.length} مهام
                    </span>
                  )}
                </div>
                
                {pendingRecommendations.length > 0 ? (
                  <div className="space-y-3">
                    {pendingRecommendations.slice(0, 3).map(rec => (
                      <RecommendationCard key={rec.id} rec={rec} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-slate-400">
                      ممتاز! لا توجد توصيات أمنية معلقة
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid sm:grid-cols-4 gap-4">
              <QuickStat
                icon={Lock}
                label="التحقق بخطوتين"
                value={settings.twoFactorEnabled ? 'مفعّل' : 'غير مفعّل'}
                enabled={settings.twoFactorEnabled}
              />
              <QuickStat
                icon={Fingerprint}
                label="مفاتيح المرور"
                value={settings.passkeyCount > 0 ? `${settings.passkeyCount} مفتاح` : 'غير مفعّل'}
                enabled={settings.passkeyEnabled}
              />
              <QuickStat
                icon={FileKey}
                label="الأكواد الاحتياطية"
                value={settings.backupCodesGenerated ? `${settings.backupCodesRemaining} متبقي` : 'غير موجودة'}
                enabled={settings.backupCodesGenerated}
              />
              <QuickStat
                icon={Smartphone}
                label="الأجهزة النشطة"
                value="3 أجهزة"
                enabled={true}
                link="/settings/devices"
              />
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Two-Factor Authentication */}
            <SettingsSection title="المصادقة" icon={Lock}>
              <SecurityFeatureCard
                icon={Lock}
                title="التحقق بخطوتين (2FA)"
                description="حماية إضافية عند تسجيل الدخول"
                enabled={settings.twoFactorEnabled}
              />
              <SecurityFeatureCard
                icon={Fingerprint}
                title="مفاتيح المرور (Passkeys)"
                description="تسجيل دخول بدون كلمة مرور"
                enabled={settings.passkeyEnabled}
              />
              <SecurityFeatureCard
                icon={FileKey}
                title="الأكواد الاحتياطية"
                description={settings.backupCodesGenerated ? `${settings.backupCodesRemaining} كود متبقي` : 'لم يتم إنشاء أكواد'}
                enabled={settings.backupCodesGenerated}
              />
            </SettingsSection>

            {/* Notifications */}
            <SettingsSection title="الإشعارات الأمنية" icon={Bell}>
              <SecurityFeatureCard
                icon={Bell}
                title="إشعارات تسجيل الدخول"
                description="تلقي إشعار عند تسجيل الدخول من جهاز جديد"
                enabled={settings.loginNotifications}
                onToggle={() => setSettings(s => ({ ...s, loginNotifications: !s.loginNotifications }))}
              />
              <SecurityFeatureCard
                icon={AlertTriangle}
                title="تنبيهات الأنشطة المشبوهة"
                description="تلقي تنبيهات فورية عند رصد نشاط مشبوه"
                enabled={settings.suspiciousActivityAlerts}
                onToggle={() => setSettings(s => ({ ...s, suspiciousActivityAlerts: !s.suspiciousActivityAlerts }))}
              />
            </SettingsSection>

            {/* Password */}
            <SettingsSection title="كلمة المرور" icon={Key}>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                      <Key className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">كلمة المرور</h4>
                      <p className="text-xs text-slate-400">
                        آخر تغيير: {settings.passwordLastChanged?.toLocaleDateString('ar-EG') || 'غير معروف'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'px-2 py-1 text-xs rounded-full',
                      settings.passwordStrength === 'strong' ? 'bg-green-500/20 text-green-400' :
                      settings.passwordStrength === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {settings.passwordStrength === 'strong' ? 'قوية' :
                       settings.passwordStrength === 'medium' ? 'متوسطة' : 'ضعيفة'}
                    </span>
                    <button className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">
                      تغيير
                    </button>
                  </div>
                </div>
              </div>
            </SettingsSection>
          </motion.div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-400" />
                سجل النشاط الأمني
              </h3>
              <button className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                <RefreshCw className="h-4 w-4" />
                تحديث
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {activityLogs.map(log => (
                <ActivityLogItem key={log.id} log={log} />
              ))}
            </div>
            <div className="p-4 border-t border-white/10 text-center">
              <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                عرض المزيد
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Security Score Circle Component
function SecurityScoreCircle({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { text: 'text-green-400', stroke: '#22c55e' };
    if (s >= 60) return { text: 'text-yellow-400', stroke: '#eab308' };
    if (s >= 40) return { text: 'text-orange-400', stroke: '#f97316' };
    return { text: 'text-red-400', stroke: '#ef4444' };
  };

  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative">
      <svg className="w-40 h-40 transform -rotate-90">
        <circle
          cx="80"
          cy="80"
          r="60"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="10"
        />
        <motion.circle
          cx="80"
          cy="80"
          r="60"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className={cn('text-4xl font-bold', colors.text)}
        >
          {score}
        </motion.span>
        <span className="text-xs text-slate-400">من 100</span>
      </div>
    </div>
  );
}

// Quick Stat Component
function QuickStat({ 
  icon: Icon, 
  label, 
  value, 
  enabled,
  link,
}: { 
  icon: typeof Shield; 
  label: string; 
  value: string; 
  enabled: boolean;
  link?: string;
}) {
  const content = (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      enabled 
        ? 'bg-white/5 border-white/10' 
        : 'bg-red-500/5 border-red-500/20',
      link && 'hover:bg-white/10 cursor-pointer'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          enabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-red-500/20 text-red-400'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-sm font-medium text-white">{value}</p>
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }
  return content;
}

// Settings Section Component
function SettingsSection({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: typeof Shield; 
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Icon className="h-5 w-5 text-indigo-400" />
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

// Security Feature Card Component
function SecurityFeatureCard({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  enabled: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      enabled
        ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30'
        : 'bg-white/5 border-white/10'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            enabled ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-slate-400'
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-medium text-white">{title}</h4>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </div>
        
        {onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors duration-200',
              enabled ? 'bg-green-500' : 'bg-slate-600'
            )}
          >
            <motion.div
              layout
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
              style={{ left: enabled ? 'calc(100% - 20px)' : '4px' }}
            />
          </button>
        )}
      </div>
    </div>
  );
}

// Recommendation Card Component
function RecommendationCard({ rec }: { rec: SecurityRecommendation }) {
  const Icon = rec.icon;
  
  const priorityColors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'rounded-xl border p-4',
        priorityColors[rec.priority]
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-white">{rec.title}</h4>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/10 text-slate-300">
              {rec.priority === 'critical' ? 'حرج' : 
               rec.priority === 'high' ? 'عالي' : 
               rec.priority === 'medium' ? 'متوسط' : 'منخفض'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2">{rec.description}</p>
          <button className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            {rec.action}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Activity Log Item Component
function ActivityLogItem({ log }: { log: ActivityLog }) {
  const statusIcons = {
    success: <CheckCircle className="h-5 w-5 text-green-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
    danger: <XCircle className="h-5 w-5 text-red-400" />,
  };

  const typeLabels = {
    login: 'تسجيل دخول',
    logout: 'تسجيل خروج',
    password_change: 'تغيير كلمة المرور',
    settings_change: 'تغيير الإعدادات',
    security_alert: 'تنبيه أمني',
    '2fa_enabled': 'تفعيل التحقق بخطوتين',
  };

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-white/5 transition-colors">
      {statusIcons[log.status]}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{typeLabels[log.type]}</span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400">{log.device}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {log.location} • {new Date(log.timestamp).toLocaleString('ar-EG')}
        </p>
      </div>
    </div>
  );
}
