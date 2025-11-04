'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Smartphone,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Fingerprint,
  Key,
  Bell,
  Lock,
  Unlock,
  Monitor,
  Loader2,
  Globe,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  deviceInfo: string;
  browser: string;
  os: string;
  ip: string;
  location?: {
    country?: string;
    city?: string;
  };
  createdAt: Date;
  lastAccessed: Date;
  isActive: boolean;
  isCurrent: boolean;
  trusted: boolean;
}

interface SecurityEvent {
  id: string;
  type: string;
  eventType: string;
  ip: string;
  userAgent: string;
  location?: string;
  createdAt: Date;
  metadata?: any;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  loginAlerts: boolean;
  suspiciousActivityAlerts: boolean;
}

export default function SecurityDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'activity' | 'settings'>('overview');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    biometricEnabled: false,
    emailNotifications: true,
    smsNotifications: false,
    loginAlerts: true,
    suspiciousActivityAlerts: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    trustedDevices: 0,
    recentEvents: 0,
    lastLogin: null as Date | null,
    securityScore: 85,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadSecurityData();
    }
  }, [user, authLoading, router]);

  const loadSecurityData = async () => {
    setIsLoading(true);

    try {
      // Load sessions
      const sessionsResponse = await fetch('/api/auth/sessions');
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setSessions(sessionsData.sessions || []);
        
        // Calculate stats
        const activeSessions = sessionsData.sessions?.filter((s: Session) => s.isActive).length || 0;
        const trustedDevices = sessionsData.sessions?.filter((s: Session) => s.trusted).length || 0;
        
        setStats((prev) => ({
          ...prev,
          totalSessions: sessionsData.sessions?.length || 0,
          activeSessions,
          trustedDevices,
        }));
      }

      // Load security events
      const eventsResponse = await fetch('/api/security/events');
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setSecurityEvents(eventsData.events || []);
        
        // Count recent events (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentEvents = eventsData.events?.filter(
          (e: SecurityEvent) => new Date(e.createdAt) > sevenDaysAgo
        ).length || 0;
        
        setStats((prev) => ({
          ...prev,
          recentEvents,
        }));
      }

      // Load settings
      const settingsResponse = await fetch('/api/security/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setSettings(settingsData.settings || settings);
        
        // Calculate security score
        const score = calculateSecurityScore({
          twoFactorEnabled: settingsData.settings?.twoFactorEnabled || false,
          biometricEnabled: settingsData.settings?.biometricEnabled || false,
          activeSessions: stats.activeSessions,
        });
        
        setStats((prev) => ({
          ...prev,
          securityScore: score,
        }));
      }

    } catch (error) {
      console.error('Failed to load security data:', error);
      toast.error('فشل تحميل بيانات الأمان');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSecurityScore = (data: {
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;
    activeSessions: number;
  }): number => {
    let score = 50; // Base score

    if (data.twoFactorEnabled) score += 30;
    if (data.biometricEnabled) score += 20;
    if (data.activeSessions <= 3) score += 10;
    else score -= 5;

    return Math.min(100, Math.max(0, score));
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم إلغاء الجلسة بنجاح');
        loadSecurityData();
      } else {
        toast.error('فشل إلغاء الجلسة');
      }
    } catch (error) {
      console.error('Failed to revoke session:', error);
      toast.error('حدث خطأ أثناء إلغاء الجلسة');
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('هل أنت متأكد من إلغاء جميع الجلسات النشطة؟ سيتم تسجيل خروجك من جميع الأجهزة.')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم إلغاء جميع الجلسات بنجاح');
        router.push('/login');
      } else {
        toast.error('فشل إلغاء الجلسات');
      }
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
      toast.error('حدث خطأ أثناء إلغاء الجلسات');
    }
  };

  const handleToggle2FA = async () => {
    router.push('/security/2fa');
  };

  const handleToggleBiometric = async () => {
    router.push('/security/biometric');
  };

  const handleToggleSetting = async (key: keyof SecuritySettings) => {
    try {
      const newValue = !settings[key];
      
      const response = await fetch('/api/security/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (response.ok) {
        setSettings((prev) => ({ ...prev, [key]: newValue }));
        toast.success('تم تحديث الإعداد بنجاح');
      } else {
        toast.error('فشل تحديث الإعداد');
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      toast.error('حدث خطأ أثناء تحديث الإعداد');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            لوحة التحكم الأمنية
          </h1>
          <p className="text-slate-400">
            إدارة أمان حسابك وأجهزتك المتصلة
          </p>
        </div>

        {/* Security Score Card */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                درجة الأمان
              </h2>
              <p className="text-indigo-100">
                {stats.securityScore >= 80
                  ? 'ممتاز! حسابك محمي بشكل جيد'
                  : stats.securityScore >= 60
                  ? 'جيد، لكن يمكن تحسينه'
                  : 'يحتاج إلى تحسين'}
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white">{stats.securityScore}</div>
              <div className="text-indigo-100">من 100</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${stats.securityScore}%` }}
            />
          </div>

          {/* Recommendations */}
          {stats.securityScore < 80 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-white">توصيات لتحسين الأمان:</p>
              <ul className="space-y-1 text-sm text-indigo-100">
                {!settings.twoFactorEnabled && (
                  <li>• قم بتفعيل المصادقة الثنائية (+30 نقطة)</li>
                )}
                {!settings.biometricEnabled && (
                  <li>• قم بتفعيل المصادقة البيومترية (+20 نقطة)</li>
                )}
                {stats.activeSessions > 3 && (
                  <li>• قلل عدد الجلسات النشطة (+10 نقاط)</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Smartphone className="h-6 w-6" />}
            label="الأجهزة النشطة"
            value={stats.activeSessions}
            color="bg-blue-500"
          />
          <StatCard
            icon={<Shield className="h-6 w-6" />}
            label="الأجهزة الموثوقة"
            value={stats.trustedDevices}
            color="bg-green-500"
          />
          <StatCard
            icon={<Activity className="h-6 w-6" />}
            label="الأحداث الأخيرة"
            value={stats.recentEvents}
            color="bg-orange-500"
          />
          <StatCard
            icon={<Clock className="h-6 w-6" />}
            label="آخر تسجيل دخول"
            value={stats.lastLogin ? new Date(stats.lastLogin).toLocaleDateString('ar') : '-'}
            color="bg-purple-500"
          />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl bg-white/5 p-2">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<Shield className="h-4 w-4" />}
          >
            نظرة عامة
          </TabButton>
          <TabButton
            active={activeTab === 'devices'}
            onClick={() => setActiveTab('devices')}
            icon={<Smartphone className="h-4 w-4" />}
          >
            الأجهزة
          </TabButton>
          <TabButton
            active={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            icon={<Activity className="h-4 w-4" />}
          >
            سجل النشاطات
          </TabButton>
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<Lock className="h-4 w-4" />}
          >
            إعدادات الأمان
          </TabButton>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <OverviewTab
              settings={settings}
              sessions={sessions}
              events={securityEvents.slice(0, 5)}
              onToggle2FA={handleToggle2FA}
              onToggleBiometric={handleToggleBiometric}
            />
          )}

          {activeTab === 'devices' && (
            <DevicesTab
              sessions={sessions}
              onRevokeSession={handleRevokeSession}
              onRevokeAll={handleRevokeAllSessions}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityTab events={securityEvents} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              onToggleSetting={handleToggleSetting}
              onToggle2FA={handleToggle2FA}
              onToggleBiometric={handleToggleBiometric}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 p-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className={cn('rounded-lg p-3', color)}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-sm text-slate-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon, children }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition whitespace-nowrap',
        active
          ? 'bg-indigo-500 text-white'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// Overview Tab Component
function OverviewTab({ settings, sessions, events, onToggle2FA, onToggleBiometric }: {
  settings: SecuritySettings;
  sessions: Session[];
  events: SecurityEvent[];
  onToggle2FA: () => void;
  onToggleBiometric: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Security Features */}
      <div className="rounded-xl bg-white/5 p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4">ميزات الأمان</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <SecurityFeatureCard
            icon={<Key className="h-5 w-5" />}
            title="المصادقة الثنائية"
            description="طبقة حماية إضافية لحسابك"
            enabled={settings.twoFactorEnabled}
            onToggle={onToggle2FA}
          />
          <SecurityFeatureCard
            icon={<Fingerprint className="h-5 w-5" />}
            title="المصادقة البيومترية"
            description="تسجيل دخول سريع وآمن"
            enabled={settings.biometricEnabled}
            onToggle={onToggleBiometric}
          />
        </div>
      </div>

      {/* Recent Devices */}
      <div className="rounded-xl bg-white/5 p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4">الأجهزة الأخيرة</h3>
        <div className="space-y-3">
          {sessions.slice(0, 3).map((session) => (
            <DeviceCard key={session.id} session={session} compact />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl bg-white/5 p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4">النشاطات الأخيرة</h3>
        <div className="space-y-3">
          {events.map((event) => (
            <ActivityCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Security Feature Card Component
function SecurityFeatureCard({ icon, title, description, enabled, onToggle }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            'rounded-lg p-2',
            enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
          )}>
            {icon}
          </div>
          <div>
            <h4 className="font-medium text-white">{title}</h4>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
        </div>
        {enabled ? (
          <CheckCircle className="h-5 w-5 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-slate-500" />
        )}
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium transition',
          enabled
            ? 'bg-slate-700 text-white hover:bg-slate-600'
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        )}
      >
        {enabled ? 'إدارة' : 'تفعيل'}
      </button>
    </div>
  );
}

// Device Card Component
function DeviceCard({ session, compact, onRevoke }: {
  session: Session;
  compact?: boolean;
  onRevoke?: (id: string) => void;
}) {
  return (
    <div className="rounded-lg bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-500/20 p-2">
            <Monitor className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-white">
                {session.browser} على {session.os}
              </h4>
              {session.isCurrent && (
                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                  الجهاز الحالي
                </span>
              )}
            </div>
            <div className="mt-1 space-y-1 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3" />
                <span>{session.ip}</span>
              </div>
              {session.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {session.location.city}, {session.location.country}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>آخر نشاط: {new Date(session.lastAccessed).toLocaleString('ar')}</span>
              </div>
            </div>
          </div>
        </div>
        {!compact && onRevoke && !session.isCurrent && (
          <button
            onClick={() => onRevoke(session.id)}
            className="rounded-lg bg-red-500/20 p-2 text-red-400 transition hover:bg-red-500/30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Activity Card Component
function ActivityCard({ event }: { event: SecurityEvent }) {
  const getEventIcon = () => {
    if (event.eventType.includes('login')) return <Unlock className="h-4 w-4" />;
    if (event.eventType.includes('2fa')) return <Key className="h-4 w-4" />;
    if (event.eventType.includes('password')) return <Lock className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getEventColor = () => {
    if (event.eventType.includes('failed') || event.eventType.includes('suspicious')) {
      return 'bg-red-500/20 text-red-400';
    }
    if (event.eventType.includes('success')) {
      return 'bg-green-500/20 text-green-400';
    }
    return 'bg-blue-500/20 text-blue-400';
  };

  return (
    <div className="flex items-start gap-3 rounded-lg bg-white/5 p-3">
      <div className={cn('rounded-lg p-2', getEventColor())}>
        {getEventIcon()}
      </div>
      <div className="flex-1">
        <div className="font-medium text-white">{event.eventType}</div>
        <div className="mt-1 text-sm text-slate-400">
          {event.ip} • {new Date(event.createdAt).toLocaleString('ar')}
        </div>
      </div>
    </div>
  );
}

// Devices Tab Component
function DevicesTab({ sessions, onRevokeSession, onRevokeAll }: {
  sessions: Session[];
  onRevokeSession: (id: string) => void;
  onRevokeAll: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">الأجهزة المتصلة</h3>
          <p className="text-sm text-slate-400">
            عدد الأجهزة النشطة: {sessions.filter(s => s.isActive).length}
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={onRevokeAll}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
          >
            إلغاء جميع الجلسات
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {sessions.map((session) => (
          <DeviceCard
            key={session.id}
            session={session}
            onRevoke={onRevokeSession}
          />
        ))}
      </div>
    </div>
  );
}

// Activity Tab Component
function ActivityTab({ events }: { events: SecurityEvent[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white">سجل النشاطات الأمنية</h3>
        <p className="text-sm text-slate-400">
          جميع الأحداث المتعلقة بأمان حسابك
        </p>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <ActivityCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ settings, onToggleSetting, onToggle2FA, onToggleBiometric }: {
  settings: SecuritySettings;
  onToggleSetting: (key: keyof SecuritySettings) => void;
  onToggle2FA: () => void;
  onToggleBiometric: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white/5 p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4">المصادقة</h3>
        <div className="space-y-4">
          <SettingToggle
            label="المصادقة الثنائية (2FA)"
            description="طبقة حماية إضافية عند تسجيل الدخول"
            enabled={settings.twoFactorEnabled}
            onToggle={onToggle2FA}
            actionLabel="إدارة"
          />
          <SettingToggle
            label="المصادقة البيومترية"
            description="استخدم بصمة الإصبع أو Face ID"
            enabled={settings.biometricEnabled}
            onToggle={onToggleBiometric}
            actionLabel="إدارة"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white/5 p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4">الإشعارات</h3>
        <div className="space-y-4">
          <SettingToggle
            label="إشعارات البريد الإلكتروني"
            description="تلقي تنبيهات أمنية عبر البريد"
            enabled={settings.emailNotifications}
            onToggle={() => onToggleSetting('emailNotifications')}
          />
          <SettingToggle
            label="تنبيهات تسجيل الدخول"
            description="إشعار عند كل تسجيل دخول جديد"
            enabled={settings.loginAlerts}
            onToggle={() => onToggleSetting('loginAlerts')}
          />
          <SettingToggle
            label="تنبيهات النشاط المشبوه"
            description="إشعار فوري عند اكتشاف نشاط غير عادي"
            enabled={settings.suspiciousActivityAlerts}
            onToggle={() => onToggleSetting('suspiciousActivityAlerts')}
          />
        </div>
      </div>
    </div>
  );
}

// Setting Toggle Component
function SettingToggle({ label, description, enabled, onToggle, actionLabel }: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-white">{label}</div>
        <div className="text-sm text-slate-400">{description}</div>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'rounded-lg px-4 py-2 text-sm font-medium transition',
          enabled
            ? 'bg-green-500/20 text-green-400'
            : 'bg-slate-700 text-slate-400'
        )}
      >
        {actionLabel || (enabled ? 'مفعّل' : 'معطّل')}
      </button>
    </div>
  );
}

