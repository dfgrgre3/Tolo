'use client';

import { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from "framer-motion";
import {
  History,
  Search,
  Filter,
  Download,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Smartphone,
  Shield,
  ArrowRight } from
'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/ui/page-container';
import apiClient, { ApiError } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import { SettingsHeader } from '../../components';

interface SecurityLog {
  id: string;
  eventType: string;
  ip: string;
  userAgent: string;
  location: string | null;
  createdAt: string;
  metadata: string | null;
}

/** Safely parses a log's metadata JSON string; malformed data must never crash the row. */
function safeParseMetadata(raw: string): { ok: true; value: unknown } | { ok: false; raw: string } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, raw };
  }
}

const EVENT_LABELS: Record<string, {label: string;color: string;icon: React.ElementType;}> = {
  LOGIN_SUCCESS: { label: 'تسجيل دخول ناجح', color: 'text-green-500', icon: CheckCircle2 },
  LOGIN_FAILED: { label: 'محاولة دخول فاشلة', color: 'text-red-500', icon: XCircle },
  LOGOUT: { label: 'تسجيل خروج', color: 'text-muted-foreground', icon: Info },
  REGISTER: { label: 'إنشاء حساب جديد', color: 'text-primary', icon: CheckCircle2 },
  PASSWORD_CHANGE: { label: 'تغيير كلمة المرور', color: 'text-yellow-500', icon: AlertTriangle },
  MAGIC_LINK_REQUESTED: { label: 'طلب رابط دخول', color: 'text-purple-500', icon: History },
  DEVICE_TRUST_CHANGE: { label: 'تغيير حالة ثقة الجهاز', color: 'text-orange-500', icon: Shield },
  SUSPICIOUS_ACTIVITY: { label: 'نشاط مشبوه', color: 'text-red-600', icon: AlertTriangle }
};

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<{ logs?: SecurityLog[] }>(`${apiRoutes.auth.securityLogs}?limit=50`);
      setLogs(data.logs || []);
    } catch (err: unknown) {
      toast.error('فشل تحميل سجل النشاطات');
      if (err instanceof ApiError || err instanceof Error) console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) =>
  EVENT_LABELS[log.eventType]?.label.includes(filter) ||
  log.ip.includes(filter) ||
  (log.location || '').includes(filter)
  );

  // Export logs to CSV
  const handleExportLogs = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.error('لا توجد سجلات للتصدير');
      return;
    }

    const headers = ['التاريخ', 'الحدث', 'IP', 'الموقع', 'User Agent', 'بيانات إضافية'];
    const rows = filteredLogs.map((log) => [
    new Date(log.createdAt).toLocaleString('ar-EG'),
    EVENT_LABELS[log.eventType]?.label || log.eventType,
    log.ip,
    log.location || 'غير معروف',
    log.userAgent,
    log.metadata || '']
    );

    const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].
    join('\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('تم تصدير السجل بنجاح');
  }, [filteredLogs]);

  return (
    <PageContainer size="xl" spacing="none" className="space-y-8 p-4">
      {/* Header */}
      <div>
        <Link
          href="/settings/security"
          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mb-2 transition-colors">

          <ArrowRight className="h-3 w-3 rotate-180" />
          العودة لصفحة الأمان
        </Link>
        <SettingsHeader
          icon={History}
          title="سجل النشاطات الأمنية"
          description="سجل كامل لجميع العمليات الحساسة المرتبطة بحسابك"
          actionButton={{
            label: 'تصدير السجل',
            onClick: handleExportLogs,
            variant: 'secondary',
            icon: Download,
          }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث في السجل..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm" />

        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card/60 border border-border text-muted-foreground hover:text-foreground transition-colors text-sm">
            <Filter className="h-4 w-4" />
            تصفية
          </button>
        </div>
      </div>

      {/* Logs Table/List */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 sm:p-6 flex items-start gap-4">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-1/3 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) :
        filteredLogs.length > 0 ?
        <div className="divide-y divide-border">
            {filteredLogs.map((log) => {
            const EventIcon = EVENT_LABELS[log.eventType]?.icon || Info;
            const isExpanded = expandedId === log.id;

            return (
              <div key={log.id} className="group transition-colors hover:bg-accent/20">
                  <div
                  className="p-4 sm:p-6 flex items-start gap-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}>

                    <div className={cn(
                    "mt-1 p-2 rounded-lg bg-muted/50 transition-colors",
                    EVENT_LABELS[log.eventType]?.color
                  )}>
                      <EventIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                        <span className={cn("font-medium truncate", EVENT_LABELS[log.eventType]?.color)}>
                          {EVENT_LABELS[log.eventType]?.label || log.eventType}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ar })}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {log.location || 'غير معروف'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {log.ip}
                        </span>
                        <span className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          {log.userAgent?.split(' ')[0] || 'غير معروف'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1">
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded &&
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-muted/10">

                        <div className="px-6 pb-6 pt-2 border-t border-border">
                          <div className="grid sm:grid-cols-2 gap-6 mt-4">
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">تفاصيل الطلب</h4>
                              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                                <p className="text-xs text-muted-foreground flex justify-between">
                                  <span>كامل User Agent:</span>
                                  <span className="text-foreground truncate max-w-[200px]" title={log.userAgent}>{log.userAgent}</span>
                                </p>
                                <p className="text-xs text-muted-foreground flex justify-between">
                                  <span>معرف IP:</span>
                                  <span className="text-foreground font-mono tracking-tighter">{log.ip}</span>
                                </p>
                                <p className="text-xs text-muted-foreground flex justify-between">
                                  <span>الوقت الدقيق:</span>
                                  <span className="text-foreground">{new Date(log.createdAt).toLocaleString('ar-EG')}</span>
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">بيانات إضافية</h4>
                              <div className="p-3 rounded-xl bg-muted/30 border border-border h-full">
                                {log.metadata ? (() => {
                                  const parsed = safeParseMetadata(log.metadata);
                                  return parsed.ok ? (
                                    <pre className="text-[10px] text-primary font-mono overflow-auto max-h-[100px]">
                                      {JSON.stringify(parsed.value, null, 2)}
                                    </pre>
                                  ) : (
                                    <p className="text-xs text-destructive italic">بيانات غير صالحة</p>
                                  );
                                })() : (
                                  <p className="text-xs text-muted-foreground italic">لا توجد بيانات إضافية مخزنة</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </m.div>
                  }
                  </AnimatePresence>
                </div>);

          })}
          </div> :

        <div className="p-20 text-center">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">لا توجد نتائج</h3>
            <p className="text-sm text-muted-foreground">لم يتم العثور على نشاطات مطابقة لعملية البحث</p>
          </div>
        }
      </div>

      {/* Notification Banner */}
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex gap-4 items-start">
        <Shield className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-foreground">لماذا هذا السجل مهم؟</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            يساعدك سجل النشاطات الأمنية على تتبع كل ما يحدث في حسابك. إذا لاحظت أي تسجيل دخول من موقع غير معتاد أو في وقت لم تكن فيه نشطاً، يرجى تغيير كلمة المرور فوراً وتفعيل المصادقة الثنائية.
          </p>
        </div>
      </div>
    </PageContainer>);

}
