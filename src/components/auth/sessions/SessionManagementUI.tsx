'use client';

/**
 * Session Management UI Component
 * User interface for managing active sessions across devices
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAdvancedSessionManager, type SessionInfo } from './AdvancedSessionManager';
import { cn } from '@/lib/utils';

export default function SessionManagementUI() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const sessionManager = getAdvancedSessionManager();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const allSessions = await sessionManager.getAllSessions();
      setSessions(allSessions);
    } catch (error) {
      toast.error('فشل تحميل الجلسات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('هل أنت متأكد من إنهاء هذه الجلسة؟')) {
      return;
    }

    setTerminatingId(sessionId);
    try {
      await sessionManager.terminateSession(sessionId);
      await loadSessions();
    } catch (error) {
      toast.error('فشل إنهاء الجلسة');
    } finally {
      setTerminatingId(null);
    }
  };

  const handleTerminateAllOthers = async () => {
    if (!confirm('هل أنت متأكد من إنهاء جميع الجلسات الأخرى؟')) {
      return;
    }

    try {
      await sessionManager.terminateAllOtherSessions();
      await loadSessions();
    } catch (error) {
      toast.error('فشل إنهاء الجلسات');
    }
  };

  const handleTrustSession = async (sessionId: string, isTrusted: boolean) => {
    try {
      if (isTrusted) {
        await sessionManager.untrustSession(sessionId);
      } else {
        await sessionManager.trustSession(sessionId);
      }
      await loadSessions();
    } catch (error) {
      toast.error('فشل تحديث حالة الثقة');
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'desktop':
        return <Monitor className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;

    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getSessionStatus = (session: SessionInfo) => {
    const now = new Date();
    if (session.expiresAt < now) {
      return { label: 'منتهية', color: 'text-red-400', bgColor: 'bg-red-500/20' };
    }
    if (session.isCurrent) {
      return { label: 'الحالية', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    }
    const lastActivity = new Date(session.lastActivityAt);
    const inactiveMinutes = (now.getTime() - lastActivity.getTime()) / 60000;
    if (inactiveMinutes > 30) {
      return { label: 'غير نشطة', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    }
    return { label: 'نشطة', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
  };

  const statistics = sessionManager.getStatistics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="h-7 w-7 text-indigo-400" />
            إدارة الجلسات
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            قم بإدارة جلساتك النشطة عبر جميع الأجهزة
          </p>
        </div>
        {sessions.filter((s) => !s.isCurrent).length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleTerminateAllOthers}
            className="flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
          >
            <Trash2 className="h-4 w-4" />
            إنهاء الجلسات الأخرى
          </motion.button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{statistics.totalSessions}</p>
              <p className="text-xs text-slate-400">إجمالي الجلسات</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/20 p-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{statistics.activeSessions}</p>
              <p className="text-xs text-slate-400">جلسات نشطة</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2 text-blue-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{statistics.trustedSessions}</p>
              <p className="text-xs text-slate-400">جلسات موثوقة</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2 text-purple-400">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {statistics.locationDistribution.size}
              </p>
              <p className="text-xs text-slate-400">مواقع مختلفة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-xl bg-white/5 border border-white/10 p-8 text-center"
            >
              <Shield className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">لا توجد جلسات نشطة</p>
            </motion.div>
          ) : (
            sessions.map((session, index) => {
              const status = getSessionStatus(session);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'rounded-xl border p-4 transition-colors',
                    session.isCurrent
                      ? 'bg-indigo-500/10 border-indigo-500/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={cn(
                          'rounded-lg p-2',
                          session.isCurrent
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-white/10 text-slate-400'
                        )}
                      >
                        {getDeviceIcon(session.deviceType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-medium text-white">
                            {session.deviceName}
                          </h3>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              status.color,
                              status.bgColor
                            )}
                          >
                            {status.label}
                          </span>
                          {session.isTrusted && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                              موثوق
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-slate-400">
                          <p className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5" />
                            {session.browser} على {session.os}
                          </p>
                          {session.location && (
                            <p className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {session.location.city}, {session.location.country}
                            </p>
                          )}
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            آخر نشاط: {formatDate(session.lastActivityAt)}
                          </p>
                          <p className="text-slate-500">IP: {session.ipAddress}</p>
                        </div>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleTrustSession(session.id, session.isTrusted)}
                          className={cn(
                            'rounded-lg p-2 transition-colors',
                            session.isTrusted
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-white/10 text-slate-400 hover:bg-white/20'
                          )}
                          title={session.isTrusted ? 'إزالة الثقة' : 'وضع علامة ثقة'}
                        >
                          {session.isTrusted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleTerminateSession(session.id)}
                          disabled={terminatingId === session.id}
                          className="rounded-lg bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {terminatingId === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Security Notice */}
      <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium mb-1">نصيحة أمنية</p>
            <p className="text-yellow-300">
              إذا رأيت جلسة لا تعرفها، قم بإنهائها فوراً وقم بتغيير كلمة المرور الخاصة بك.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

