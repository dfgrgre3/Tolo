'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Loader2,
  ArrowRight } from
'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SecurityLog {
  id: string;
  eventType: string;
  ip: string;
  userAgent: string;
  location: string | null;
  createdAt: string;
  metadata: string | null;
}

const EVENT_LABELS: Record<string, {label: string;color: string;icon: any;}> = {
  LOGIN_SUCCESS: { label: 'تسجيل دخول ناجح', color: 'text-green-400', icon: CheckCircle2 },
  LOGIN_FAILED: { label: 'محاولة دخول فاشلة', color: 'text-red-400', icon: XCircle },
  LOGOUT: { label: 'تسجيل خروج', color: 'text-slate-400', icon: Info },
  REGISTER: { label: 'إنشاء حساب جديد', color: 'text-indigo-400', icon: CheckCircle2 },
  PASSWORD_CHANGE: { label: 'تغيير كلمة المرور', color: 'text-yellow-400', icon: AlertTriangle },
  MAGIC_LINK_REQUESTED: { label: 'طلب رابط دخول', color: 'text-purple-400', icon: History },
  DEVICE_TRUST_CHANGE: { label: 'تغيير حالة ثقة الجهاز', color: 'text-orange-400', icon: Shield },
  SUSPICIOUS_ACTIVITY: { label: 'نشاط مشبوه', color: 'text-red-500', icon: AlertTriangle }
};

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/security-logs?limit=50');
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (_error) {
      toast.error('فشل تحميل سجل النشاطات');
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

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
    <div className="max-w-5xl mx-auto space-y-8 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/settings/security"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-2 transition-colors">
            
            <ArrowRight className="h-3 w-3 rotate-180" />
            العودة لصفحة الأمان
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <History className="h-7 w-7 text-indigo-400" />
            سجل النشاطات الأمنية
          </h1>
          <p className="text-sm text-slate-400 mt-1">سجل كامل لجميع العمليات الحساسة المرتبطة بحسابك</p>
        </div>

        <button
          onClick={handleExportLogs}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm">
          
          <Download className="h-4 w-4" />
          تصدير السجل
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="بحث في السجل..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm" />
          
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors text-sm">
            <Filter className="h-4 w-4" />
            تصفية
          </button>
        </div>
      </div>

      {/* Logs Table/List */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
        {isLoading ?
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-slate-400 animate-pulse">جاري تحميل السجل...</p>
          </div> :
        filteredLogs.length > 0 ?
        <div className="divide-y divide-white/5">
            {filteredLogs.map((log) => {
            const EventIcon = EVENT_LABELS[log.eventType]?.icon || Info;
            const isExpanded = expandedId === log.id;

            return (
              <div key={log.id} className="group transition-colors hover:bg-white/[0.02]">
                  <div
                  className="p-4 sm:p-6 flex items-start gap-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                  
                    <div className={cn(
                    "mt-1 p-2 rounded-lg bg-white/5 transition-colors",
                    EVENT_LABELS[log.eventType]?.color
                  )}>
                      <EventIcon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                        <span className={cn("font-medium truncate", EVENT_LABELS[log.eventType]?.color)}>
                          {EVENT_LABELS[log.eventType]?.label || log.eventType}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
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
                          {log.userAgent.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1">
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded &&
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-white/[0.01]">
                    
                        <div className="px-6 pb-6 pt-2 border-t border-white/5">
                          <div className="grid sm:grid-cols-2 gap-6 mt-4">
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">تفاصيل الطلب</h4>
                              <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2">
                                <p className="text-xs text-slate-400 flex justify-between">
                                  <span>كامل User Agent:</span>
                                  <span className="text-slate-200 truncate max-w-[200px]" title={log.userAgent}>{log.userAgent}</span>
                                </p>
                                <p className="text-xs text-slate-400 flex justify-between">
                                  <span>معرف IP:</span>
                                  <span className="text-slate-200 font-mono tracking-tighter">{log.ip}</span>
                                </p>
                                <p className="text-xs text-slate-400 flex justify-between">
                                  <span>الوقت الدقيق:</span>
                                  <span className="text-slate-200">{new Date(log.createdAt).toLocaleString('ar-EG')}</span>
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">بيانات إضافية</h4>
                              <div className="p-3 rounded-xl bg-black/20 border border-white/5 h-full">
                                {log.metadata ?
                            <pre className="text-[10px] text-indigo-300 font-mono overflow-auto max-h-[100px]">
                                    {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                  </pre> :

                            <p className="text-xs text-slate-500 italic">لا توجد بيانات إضافية مخزنة</p>
                            }
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                  }
                  </AnimatePresence>
                </div>);

          })}
          </div> :

        <div className="p-20 text-center">
            <Info className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">لا توجد نتائج</h3>
            <p className="text-sm text-slate-400">لم يتم العثور على نشاطات مطابقة لعملية البحث</p>
          </div>
        }
      </div>

      {/* Notification Banner */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex gap-4 items-start">
        <Shield className="h-6 w-6 text-indigo-400 shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-white">لماذا هذا السجل مهم؟</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            يساعدك سجل النشاطات الأمنية على تتبع كل ما يحدث في حسابك. إذا لاحظت أي تسجيل دخول من موقع غير معتاد أو في وقت لم تكن فيه نشطاً، يرجى تغيير كلمة المرور فوراً وتفعيل المصادقة الثنائية.
          </p>
        </div>
      </div>
    </div>);

}