'use client';

import { useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Shield,
  Clock,
  AlertTriangle,
  Loader2,
  LogOut,
  RefreshCw } from
'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PageContainer } from '@/components/ui/page-container';
import { useSessions, type Device } from '../_hooks/use-sessions';
import { SettingsHeader, SettingsSection } from '../components';

import { LoadingState } from '../_components/loading-state';

export default function DevicesPage() {
  const {
    sessions: devices,
    isLoading,
    isRefreshing,
    revokingId,
    isRevokingAll,
    refresh,
    revokeSession,
    revokeAll,
  } = useSessions();
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'فشل تحميل الأجهزة المتصلة');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async (deviceId: string) => {
    try {
      await revokeSession(deviceId);
      toast.success('تم تسجيل خروج الجهاز بنجاح');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'فشل إنهاء الجلسة');
    }
  };

  const handleRevokeAll = async () => {
    setShowRevokeAllConfirm(false);
    try {
      await revokeAll();
      toast.success('تم تسجيل خروج جميع الأجهزة الأخرى بنجاح');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'فشل تسجيل الخروج من الأجهزة الأخرى');
    }
  };

  const currentDevice = useMemo(() => devices.find((device) => device.isCurrent), [devices]);
  const otherDevices = useMemo(() => devices.filter((device) => !device.isCurrent), [devices]);
  const uniqueIpCount = useMemo(() => new Set(devices.map((device) => device.ip)).size, [devices]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <PageContainer size="lg" spacing="none" className="space-y-8">
      <SettingsHeader
        icon={Smartphone}
        title="الأجهزة المتصلة"
        description="إدارة الجلسات النشطة المرتبطة بحسابك"
        actionButton={
          otherDevices.length > 0
            ? {
                label: 'تسجيل خروج الكل',
                onClick: () => setShowRevokeAllConfirm(true),
                variant: 'danger',
                icon: LogOut,
              }
            : undefined
        }
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-card/60 border border-border p-4">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{devices.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي الجلسات</p>
            </div>
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-card/60 border border-border p-4">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
              <Globe className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{uniqueIpCount}</p>
              <p className="text-xs text-muted-foreground">عناوين IP مختلفة</p>
            </div>
          </div>
        </m.div>
      </div>

      {currentDevice &&
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/30 overflow-hidden">

          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <h3 className="font-semibold text-foreground">هذا الجهاز</h3>
            </div>
          </div>
          <DeviceCard device={currentDevice} onRevoke={() => undefined} />
        </m.div>
      }

      {otherDevices.length > 0 &&
      <SettingsSection icon={Monitor} title={`أجهزة أخرى (${otherDevices.length})`}>
          <div className="flex justify-end -mt-2 mb-2">
            <button
            onClick={() => refresh(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">

              {isRefreshing ?
            <Loader2 className="h-4 w-4 animate-spin" /> :

            <RefreshCw className="h-4 w-4" />
            }
              تحديث
            </button>
          </div>
          <div className="divide-y divide-border -mx-4">
            <AnimatePresence>
              {otherDevices.map((device, index) =>
            <m.div
              key={device.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}>

                  <DeviceCard
                device={device}
                onRevoke={() => handleRevoke(device.id)}
                isRevoking={revokingId === device.id} />

                </m.div>
            )}
            </AnimatePresence>
          </div>
        </SettingsSection>
      }

      {otherDevices.length === 0 &&
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-card/60 border border-border p-8 text-center">

          <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد أجهزة أخرى</h3>
          <p className="text-sm text-muted-foreground">أنت مسجل دخول فقط من هذا الجهاز</p>
        </m.div>
      }

      <AnimatePresence>
        {showRevokeAllConfirm &&
        <>
            <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRevokeAllConfirm(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

            <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">

              <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/15">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">تسجيل خروج الأجهزة الأخرى</h3>
                    <p className="text-sm text-muted-foreground">
                      سيتم تسجيل خروجك من جميع الأجهزة الأخرى، مع إبقاء هذا الجهاز متصلاً
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                  onClick={() => setShowRevokeAllConfirm(false)}
                  disabled={isRevokingAll}
                  className="flex-1 p-3 rounded-xl bg-accent text-foreground font-medium hover:bg-accent/80 transition-colors disabled:opacity-60">

                    إلغاء
                  </button>
                  <button
                  onClick={handleRevokeAll}
                  disabled={isRevokingAll}
                  className="flex-1 p-3 rounded-xl bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">

                    {isRevokingAll && <Loader2 className="h-4 w-4 animate-spin" />}
                    تأكيد
                  </button>
                </div>
              </div>
            </m.div>
          </>
        }
      </AnimatePresence>
    </PageContainer>);

}

function DeviceCard({
  device,
  onRevoke,
  isRevoking = false
}: {device: Device;onRevoke: () => void;isRevoking?: boolean;}) {
  const DeviceIcon = device.type === 'mobile' ? Smartphone : device.type === 'tablet' ? Tablet : Monitor;

  return (
    <div className="p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            device.isCurrent ? 'bg-primary/15' : 'bg-muted'
          )}>

          <DeviceIcon
            className={cn(
              'h-6 w-6',
              device.isCurrent ? 'text-primary' : 'text-muted-foreground'
            )} />

        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-foreground truncate">{device.name}</h4>
            {device.isCurrent &&
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                هذا الجهاز
              </span>
            }
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {device.browser} ⬢ {device.os}
            </span>
            <span className="flex items-center gap-1">
              IP: {device.ip}
            </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {device.isCurrent ?
                'نشط الآن' :
                device.lastActive ?
                formatDistanceToNow(device.lastActive, { addSuffix: true, locale: ar }) :
                'تاريخ غير معروف'}
              </span>
          </div>
        </div>

        {!device.isCurrent &&
        <button
          onClick={onRevoke}
          disabled={isRevoking}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">

            {isRevoking ?
          <Loader2 className="h-5 w-5 animate-spin" /> :

          <LogOut className="h-5 w-5" />
          }
          </button>
        }
      </div>
    </div>
  );
}
