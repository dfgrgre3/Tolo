'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Monitor,
  Key,
  Lock,
  Unlock,
  UserPlus,
  LogOut,
  Settings,
  Filter,
  Download,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SecurityEvent {
  id: string;
  type: string;
  eventType: string;
  ip: string;
  userAgent: string;
  location?: string;
  metadata?: any;
  createdAt: Date;
  severity: 'info' | 'warning' | 'critical';
}

type EventFilter = 'all' | 'login' | 'security' | 'settings' | 'suspicious';

export default function ActivityLogPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [timeRange, setTimeRange] = useState('7'); // days

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadActivityLog();
    }
  }, [user, authLoading, router, timeRange, filter]);

  const loadActivityLog = async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        days: timeRange,
        ...(filter !== 'all' && { type: filter }),
      });

      const response = await fetch(`/api/security/events?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Add severity to events
        const eventsWithSeverity = data.events.map((event: SecurityEvent) => ({
          ...event,
          severity: determineEventSeverity(event.eventType),
        }));
        
        setEvents(eventsWithSeverity);
      } else {
        toast.error('فشل تحميل سجل النشاطات');
      }
    } catch (error) {
      console.error('Failed to load activity log:', error);
      toast.error('حدث خطأ أثناء تحميل السجل');
    } finally {
      setIsLoading(false);
    }
  };

  const determineEventSeverity = (
    eventType: string
  ): 'info' | 'warning' | 'critical' => {
    if (
      eventType.includes('failed') ||
      eventType.includes('blocked') ||
      eventType.includes('suspicious')
    ) {
      return 'critical';
    }
    if (
      eventType.includes('password') ||
      eventType.includes('2fa') ||
      eventType.includes('device_removed')
    ) {
      return 'warning';
    }
    return 'info';
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('login_success')) return <CheckCircle className="h-5 w-5" />;
    if (eventType.includes('login_failed')) return <XCircle className="h-5 w-5" />;
    if (eventType.includes('logout')) return <LogOut className="h-5 w-5" />;
    if (eventType.includes('register')) return <UserPlus className="h-5 w-5" />;
    if (eventType.includes('password')) return <Key className="h-5 w-5" />;
    if (eventType.includes('2fa')) return <Shield className="h-5 w-5" />;
    if (eventType.includes('session')) return <Monitor className="h-5 w-5" />;
    if (eventType.includes('settings')) return <Settings className="h-5 w-5" />;
    if (eventType.includes('suspicious') || eventType.includes('blocked')) {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return <Activity className="h-5 w-5" />;
  };

  const getEventColor = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getEventTitle = (eventType: string): string => {
    const titles: Record<string, string> = {
      login_success: 'تسجيل دخول ناجح',
      login_failed: 'محاولة تسجيل دخول فاشلة',
      login_blocked_high_risk: 'تسجيل دخول محظور - خطر عالي',
      login_rate_limited: 'محاولات دخول متكررة',
      register_success: 'إنشاء حساب جديد',
      logout: 'تسجيل خروج',
      password_changed: 'تغيير كلمة المرور',
      password_reset: 'إعادة تعيين كلمة المرور',
      two_factor_enabled: 'تفعيل المصادقة الثنائية',
      two_factor_disabled: 'تعطيل المصادقة الثنائية',
      two_factor_challenge_created: 'طلب رمز التحقق',
      two_factor_verified: 'تحقق ثنائي ناجح',
      session_created: 'جلسة جديدة',
      session_revoked: 'إلغاء جلسة',
      all_sessions_revoked: 'إلغاء جميع الجلسات',
      biometric_registered: 'تسجيل مصادقة بيومترية',
      biometric_login_success: 'تسجيل دخول بيومتري',
      security_settings_updated: 'تحديث إعدادات الأمان',
      risk_assessment: 'تقييم المخاطر',
      suspicious_activity: 'نشاط مشبوه',
    };

    return titles[eventType] || eventType;
  };

  const exportActivityLog = async () => {
    try {
      const csvContent = [
        ['التاريخ', 'النوع', 'IP', 'المتصفح', 'الحالة'].join(','),
        ...events.map((event) =>
          [
            new Date(event.createdAt).toLocaleString('ar'),
            getEventTitle(event.eventType),
            event.ip,
            event.userAgent.substring(0, 50),
            event.severity,
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `activity-log-${new Date().toISOString()}.csv`;
      link.click();

      toast.success('تم تصدير السجل بنجاح');
    } catch (error) {
      console.error('Failed to export activity log:', error);
      toast.error('فشل تصدير السجل');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    if (filter === 'login') return event.eventType.includes('login');
    if (filter === 'security') {
      return (
        event.eventType.includes('2fa') ||
        event.eventType.includes('password') ||
        event.eventType.includes('biometric')
      );
    }
    if (filter === 'settings') return event.eventType.includes('settings');
    if (filter === 'suspicious') {
      return (
        event.eventType.includes('suspicious') ||
        event.eventType.includes('blocked') ||
        event.eventType.includes('failed')
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/security')}
              className="rounded-lg bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">سجل النشاطات الأمنية</h1>
              <p className="mt-1 text-slate-400">
                سجل شامل لجميع الأحداث المتعلقة بأمان حسابك
              </p>
            </div>
          </div>

          <button
            onClick={exportActivityLog}
            className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
          >
            <Download className="h-4 w-4" />
            تصدير السجل
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Event Type Filter */}
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as EventFilter)}
              className="bg-transparent text-sm text-white outline-none"
            >
              <option value="all">جميع الأحداث</option>
              <option value="login">تسجيل الدخول</option>
              <option value="security">الأمان</option>
              <option value="settings">الإعدادات</option>
              <option value="suspicious">النشاط المشبوه</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-sm text-white outline-none"
            >
              <option value="1">آخر 24 ساعة</option>
              <option value="7">آخر 7 أيام</option>
              <option value="30">آخر 30 يوم</option>
              <option value="90">آخر 90 يوم</option>
            </select>
          </div>

          <div className="flex-1"></div>

          {/* Results Count */}
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-300">
            <Activity className="h-4 w-4" />
            <span>
              {filteredEvents.length} حدث
            </span>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <div className="rounded-xl bg-white/5 p-12 text-center backdrop-blur">
              <Activity className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-slate-400">لا توجد أحداث لعرضها</p>
            </div>
          ) : (
            filteredEvents.map((event, index) => (
              <div key={event.id} className="relative">
                {/* Timeline Line */}
                {index !== filteredEvents.length - 1 && (
                  <div className="absolute right-[27px] top-12 h-full w-0.5 bg-slate-700"></div>
                )}

                {/* Event Card */}
                <div className="flex gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border backdrop-blur',
                      getEventColor(event.severity)
                    )}
                  >
                    {getEventIcon(event.eventType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-xl bg-white/5 p-4 backdrop-blur">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">
                          {getEventTitle(event.eventType)}
                        </h3>
                        
                        <div className="mt-2 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(event.createdAt).toLocaleString('ar', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{event.ip}</span>
                          </div>

                          {event.metadata && (
                            <>
                              {event.metadata.riskLevel && (
                                <div className="flex items-center gap-2">
                                  <Shield className="h-3 w-3" />
                                  <span>
                                    مستوى الخطر: {event.metadata.riskLevel}
                                  </span>
                                </div>
                              )}
                              
                              {event.metadata.sessionId && (
                                <div className="flex items-center gap-2">
                                  <Monitor className="h-3 w-3" />
                                  <span className="truncate">
                                    {event.metadata.sessionId.substring(0, 8)}...
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {event.userAgent && (
                          <div className="mt-2 text-xs text-slate-500">
                            <Monitor className="inline h-3 w-3 mr-1" />
                            {event.userAgent.substring(0, 80)}
                            {event.userAgent.length > 80 && '...'}
                          </div>
                        )}
                      </div>

                      {/* Severity Badge */}
                      <div
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium',
                          event.severity === 'critical'
                            ? 'bg-red-500/20 text-red-400'
                            : event.severity === 'warning'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        )}
                      >
                        {event.severity === 'critical'
                          ? 'حرج'
                          : event.severity === 'warning'
                          ? 'تحذير'
                          : 'معلومات'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

