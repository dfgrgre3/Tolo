'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Shield,
  Clock,
  AlertTriangle,
  Loader2,
  MoreVertical,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';

type SessionApiRecord = {
  id: string;
  userAgent: string;
  ip: string;
  deviceInfo: string | null;
  createdAt: string;
  lastAccessed: string;
  expiresAt: string;
  isCurrent: boolean;
};

type Device = {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
  isTrusted: boolean;
};

type ParsedDeviceInfo = {
  name?: string;
  browser?: string;
  os?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  trusted?: boolean;
};

function detectDevice(ua: string): { browser: string; os: string; type: Device['type'] } {
  const value = ua.toLowerCase();

  let browser = 'Unknown';
  if (value.includes('edg/')) browser = 'Edge';
  else if (value.includes('chrome/') && !value.includes('edg/')) browser = 'Chrome';
  else if (value.includes('firefox/')) browser = 'Firefox';
  else if (value.includes('safari/') && !value.includes('chrome/')) browser = 'Safari';

  let os = 'Unknown OS';
  if (value.includes('windows')) os = 'Windows';
  else if (value.includes('mac os')) os = 'macOS';
  else if (value.includes('android')) os = 'Android';
  else if (value.includes('iphone') || value.includes('ipad') || value.includes('ios')) os = 'iOS';
  else if (value.includes('linux')) os = 'Linux';

  let type: Device['type'] = 'desktop';
  if (value.includes('ipad') || value.includes('tablet')) type = 'tablet';
  else if (value.includes('mobile') || value.includes('android') || value.includes('iphone')) type = 'mobile';

  return { browser, os, type };
}

function parseDeviceInfo(raw: string | null): ParsedDeviceInfo {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ParsedDeviceInfo;
  } catch {
    return {};
  }
}

function mapSessionToDevice(session: SessionApiRecord): Device {
  const info = parseDeviceInfo(session.deviceInfo);
  const fallback = detectDevice(session.userAgent || '');
  const type = info.deviceType ?? fallback.type;
  const browser = info.browser ?? fallback.browser;
  const os = info.os ?? fallback.os;
  const name = info.name ?? `${browser} على ${os}`;

  return {
    id: session.id,
    name,
    type,
    browser,
    os,
    ip: session.ip || 'unknown',
    location: session.ip || 'unknown',
    lastActive: new Date(session.lastAccessed),
    isCurrent: session.isCurrent,
    isTrusted: Boolean(info.trusted),
  };
}

export default function DevicesPage() {
  const { logout } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);

  const loadDevices = useCallback(async (refreshOnly = false) => {
    if (refreshOnly) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active sessions');
      }

      const payload = (await response.json()) as { sessions?: SessionApiRecord[] };
      const mapped = Array.isArray(payload.sessions)
        ? payload.sessions.map(mapSessionToDevice)
        : [];
      setDevices(mapped);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل تحميل الأجهزة المتصلة';
      toast.error(message);
      setDevices([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleRevoke = async (deviceId: string) => {
    setIsRevoking(deviceId);

    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: deviceId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to revoke session' }));
        throw new Error(payload.error || 'Failed to revoke session');
      }

      setDevices(prev => prev.filter(device => device.id !== deviceId));
      toast.success('تم تسجيل خروج الجهاز بنجاح');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل إنهاء الجلسة';
      toast.error(message);
    } finally {
      setIsRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    setShowRevokeAllConfirm(false);
    await logout(true);
  };

  const currentDevice = useMemo(() => devices.find(device => device.isCurrent), [devices]);
  const otherDevices = useMemo(() => devices.filter(device => !device.isCurrent), [devices]);
  const trustedCount = useMemo(() => devices.filter(device => device.isTrusted).length, [devices]);
  const uniqueIpCount = useMemo(() => new Set(devices.map(device => device.ip)).size, [devices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Smartphone className="h-7 w-7 text-indigo-400" />
            الأجهزة المتصلة
          </h1>
          <p className="text-sm text-slate-400 mt-1">إدارة الجلسات النشطة المرتبطة بحسابك</p>
        </div>

        {otherDevices.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRevokeAllConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 font-medium border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            تسجيل خروج الكل
          </motion.button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
              <Monitor className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{devices.length}</p>
              <p className="text-xs text-slate-400">إجمالي الجلسات</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
              <Shield className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{trustedCount}</p>
              <p className="text-xs text-slate-400">جلسات موثوقة</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
              <Globe className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{uniqueIpCount}</p>
              <p className="text-xs text-slate-400">عناوين IP مختلفة</p>
            </div>
          </div>
        </motion.div>
      </div>

      {currentDevice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 overflow-hidden"
        >
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <h3 className="font-semibold text-white">هذا الجهاز</h3>
            </div>
          </div>
          <DeviceCard device={currentDevice} onRevoke={() => undefined} />
        </motion.div>
      )}

      {otherDevices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-400" />
              أجهزة أخرى ({otherDevices.length})
            </h3>
            <button
              onClick={() => loadDevices(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-60"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              تحديث
            </button>
          </div>
          <div className="divide-y divide-white/5">
            <AnimatePresence>
              {otherDevices.map((device, index) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <DeviceCard
                    device={device}
                    onRevoke={() => handleRevoke(device.id)}
                    isRevoking={isRevoking === device.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {otherDevices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center"
        >
          <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">لا توجد أجهزة أخرى</h3>
          <p className="text-sm text-slate-400">أنت مسجل دخول فقط من هذا الجهاز</p>
        </motion.div>
      )}

      <AnimatePresence>
        {showRevokeAllConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRevokeAllConfirm(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">تسجيل خروج جميع الأجهزة</h3>
                    <p className="text-sm text-slate-400">
                      سيتم تسجيل خروجك من كل الأجهزة بما فيها الجهاز الحالي
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRevokeAllConfirm(false)}
                    className="flex-1 p-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleRevokeAll}
                    className="flex-1 p-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                  >
                    تأكيد
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeviceCard({
  device,
  onRevoke,
  isRevoking = false,
}: {
  device: Device;
  onRevoke: () => void;
  isRevoking?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const DeviceIcon = device.type === 'mobile' ? Smartphone : device.type === 'tablet' ? Tablet : Monitor;

  return (
    <div className="p-4 hover:bg-white/5 transition-colors">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            device.isCurrent ? 'bg-indigo-500/20' : 'bg-white/10'
          )}
        >
          <DeviceIcon
            className={cn(
              'h-6 w-6',
              device.isCurrent ? 'text-indigo-400' : 'text-slate-400'
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-white truncate">{device.name}</h4>
            {device.isCurrent && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-400">
                هذا الجهاز
              </span>
            )}
            {device.isTrusted && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-yellow-500/20 text-yellow-300">
                موثوق
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {device.browser} • {device.os}
            </span>
            <span className="flex items-center gap-1">
              IP: {device.ip}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {device.isCurrent
                ? 'نشط الآن'
                : formatDistanceToNow(device.lastActive, { addSuffix: true, locale: ar })}
            </span>
          </div>
        </div>

        {!device.isCurrent && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-slate-400" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMenu(false)}
                    className="fixed inset-0 z-10"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute left-0 top-full mt-2 w-48 rounded-xl bg-slate-800 border border-white/10 shadow-xl z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        onRevoke();
                        setShowMenu(false);
                      }}
                      disabled={isRevoking}
                      className="w-full flex items-center gap-2 p-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {isRevoking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      تسجيل خروج الجهاز
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
