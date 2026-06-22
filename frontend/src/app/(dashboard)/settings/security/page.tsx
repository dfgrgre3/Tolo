'use client';

/**
 * 🔐 صفحة الأمان - Security Settings
 * 
 * إدارة أمان الحساب:
 * - إدارة كلمات المرور، رقم الهاتف والمصادقة الثنائية عبر Clerk
 * - سجل النشاطات الأمنية
 * - حذف الحساب
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ar } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import { Shield, History, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { DeleteAccountDialog } from '../components';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { UserProfile } from '@clerk/nextjs';
import { useTheme } from '@/providers/theme-provider';

interface SecurityLog {
  ip: string;
  userAgent: string;
  location: string | null;
  id: string;
  eventType: string;
  createdAt: string;
}

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'تسجيل دخول ناجح',
  LOGIN_FAILED: 'محاولة دخول فاشلة',
  LOGOUT: 'تسجيل خروج',
  REGISTER: 'إنشاء حساب جديد',
  PASSWORD_CHANGE: 'تغيير كلمة المرور',
  MAGIC_LINK_REQUESTED: 'طلب رابط دخول',
  DEVICE_TRUST_CHANGE: 'تغيير حالة ثقة الجهاز',
  SUSPICIOUS_ACTIVITY: 'نشاط مشبوه'
};

function SecurityLogsSection() {
  const [recentLogs, setRecentLogs] = useState<SecurityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  const fetchRecentLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/security-logs?limit=3');
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.details || error.error || 'Failed to fetch logs');
      }
      const data = await res.json();
      setRecentLogs(data.logs || []);
    } catch (err: any) {
      logger.error(err.message || 'Failed to fetch logs');
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentLogs();
  }, [fetchRecentLogs]);

  return (
    <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-indigo-400" />
          سجل النشاطات الأمنية
        </h3>
        <Link href="/settings/security/logs" className="text-sm text-indigo-400 hover:underline">عرض الكل</Link>
      </div>
      <div className="space-y-4">
        {isLoadingLogs ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
          </div>
        ) : recentLogs.length > 0 ? (
          recentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {log.eventType.includes('SUCCESS') || log.eventType === 'REGISTER' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : log.eventType.includes('FAILED') || log.eventType.includes('SUSPICIOUS') ? (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                ) : (
                  <Shield className="h-4 w-4 text-indigo-400" />
                )}
                <span className="text-slate-300">
                  {EVENT_LABELS[log.eventType] || log.eventType}
                </span>
              </div>
              <span className="text-slate-500">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ar })}
              </span>
            </div>
          ))
        ) : (
          <p className="text-center text-xs text-slate-500 py-2">لا يوجد نشاطات مسجلة حتى الآن</p>
        )}
      </div>
    </section>
  );
}

function DangerZone({ userId }: { userId: string | undefined }) {
  const router = useRouter();

  const handleDeleteAccount = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });

      if (res.ok) {
        toast.success("تم حذف الحساب بنجاح");
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        const errorData = await res.json().catch(() => ({ error: "حدث خطأ غير معروف" }));
        toast.error(errorData.error || "حدث خطأ أثناء حذف الحساب");
      }
    } catch (error) {
      logger.error("Error deleting account:", error);
      toast.error("حدث خطأ أثناء حذف الحساب");
    }
  };

  return (
    <section className="rounded-2xl bg-red-500/5 border border-red-500/20 overflow-hidden">
      <div className="p-4 border-b border-red-500/20 bg-red-500/10">
        <h3 className="font-semibold text-red-400 flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" />
          منطقة الخطر
        </h3>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium text-white">حذف الحساب نهائياً</h4>
            <p className="text-sm text-slate-400 mt-1">
              سيتم حذف حسابك وجميع بياناتك بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
            </p>
          </div>
          <DeleteAccountDialog onConfirm={handleDeleteAccount} />
        </div>
      </div>
    </section>
  );
}

export default function SecurityPage() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="h-7 w-7 text-indigo-400" />
          الأمان وحماية الحساب
        </h1>
        <p className="text-sm text-slate-400 mt-1">إدارة كلمات المرور، رقم الهاتف والمصادقة الثنائية</p>
      </div>

      {/* Clerk UserProfile Section */}
      <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <UserProfile
          routing="hash"
          appearance={{
            variables: {
              colorPrimary: '#f97316', // Orange matching Tolo's brand color
              colorBackground: isDark ? 'rgba(15, 23, 42, 0.4)' : '#ffffff',
              colorText: isDark ? '#f8fafc' : '#0f172a',
              colorTextSecondary: isDark ? '#94a3b8' : '#475569',
              colorInputBackground: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
              colorInputText: isDark ? '#f8fafc' : '#0f172a',
              colorBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              borderRadius: '1rem',
              fontFamily: 'var(--font-alexandria), sans-serif',
            },
            elements: {
              card: 'bg-transparent border-0 shadow-none p-0 w-full max-w-full',
              scrollBox: 'bg-transparent shadow-none w-full max-w-full rounded-2xl',
              pageScrollBox: 'bg-transparent w-full max-w-full p-6',
              navbar: 'border-r border-slate-200 dark:border-slate-800/40 pr-4',
              navbarButton: 'text-slate-600 dark:text-slate-400 hover:text-white',
              profileSectionTitle: 'border-b border-slate-200 dark:border-slate-800/40 pb-2',
              headerTitle: 'text-white font-bold',
              headerSubtitle: 'text-slate-400',
              formButtonPrimary: 'bg-orange-500 hover:bg-orange-600 text-white transition-all',
            }
          }}
        />
      </section>

      <SecurityLogsSection />
      <DangerZone userId={user?.id} />
    </div>
  );
}