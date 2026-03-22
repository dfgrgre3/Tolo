'use client';

/**
 * 🔐 صفحة الأمان - Security Settings
 * 
 * إدارة أمان الحساب:
 * - تغيير كلمة المرور
 * - التحقق بخطوتين
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ar } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Key, 
  Lock, 
  ChevronRight, 
  LogOut, 
  History,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Settings,
  ShieldCheck,
  ShieldX,
  Smartphone
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { DeleteAccountDialog, TwoFactorSetupModal, PhoneVerificationModal } from '../components';
import { useRouter } from 'next/navigation';

export default function SecurityPage() {
  const { logout, user, refreshUser } = useAuth();
  const router = useRouter();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Two-Factor Authentication State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading2FA, setIsLoading2FA] = useState(true);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  
  // Phone Verification State
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  
  // Security Logs State
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  const EVENT_LABELS: Record<string, string> = {
    LOGIN_SUCCESS: 'تسجيل دخول ناجح',
    LOGIN_FAILED: 'محاولة دخول فاشلة',
    LOGOUT: 'تسجيل خروج',
    REGISTER: 'إنشاء حساب جديد',
    PASSWORD_CHANGE: 'تغيير كلمة المرور',
    MAGIC_LINK_REQUESTED: 'طلب رابط دخول',
    DEVICE_TRUST_CHANGE: 'تغيير حالة ثقة الجهاز',
    SUSPICIOUS_ACTIVITY: 'نشاط مشبوه',
  };

  // Fetch 2FA Status
  const fetch2FAStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/2fa/status');
      if (res.ok) {
        const data = await res.json();
        setIs2FAEnabled(data.enabled);
      }
    } catch (err) {
      console.error('Failed to fetch 2FA status');
    } finally {
      setIsLoading2FA(false);
    }
  }, []);

  
  // Fetch Recent Security Logs
  const fetchRecentLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/security-logs?limit=3');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecentLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs');
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetch2FAStatus();
    fetchRecentLogs();
  }, [fetch2FAStatus, fetchRecentLogs]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('كلمات المرور الجديدة غير متطابقة');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل تغيير كلمة المرور');
      }

      toast.success('تم تغيير كلمة المرور بنجاح');
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 2FA Toggle
  const handle2FAToggle = async () => {
    if (is2FAEnabled) {
      // Disable 2FA
      setIsDisabling2FA(true);
      try {
        const res = await fetch('/api/auth/2fa/disable', { method: 'POST' });
        if (res.ok) {
          setIs2FAEnabled(false);
          toast.success('تم تعطيل المصادقة الثنائية');
        } else {
          const error = await res.json();
          throw new Error(error.error || 'فشل في تعطيل المصادقة الثنائية');
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsDisabling2FA(false);
      }
    } else {
      // Enable 2FA - show modal
      setShow2FAModal(true);
    }
  };

  const handle2FASuccess = () => {
    setIs2FAEnabled(true);
    fetch2FAStatus();
  };

  
  
  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      console.error("Error deleting account:", error);
      toast.error("حدث خطأ أثناء حذف الحساب");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="h-7 w-7 text-indigo-400" />
          الأمان
        </h1>
        <p className="text-sm text-slate-400 mt-1">إدارة وحماية حسابك وتغيير كلمات المرور</p>
      </div>

      {/* Password Section */}
      <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Key className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">كلمة المرور</h3>
                <p className="text-sm text-slate-400">آخر تغيير: منذ 3 أشهر</p>
              </div>
            </div>
            <button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              {isChangingPassword ? 'إلغاء' : 'تحديث'}
            </button>
          </div>

          {isChangingPassword && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              onSubmit={handlePasswordChange}
              className="space-y-4 border-t border-white/10 pt-6"
            >
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">كلمة المرور الحالية</label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">تأكيد كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                تحديث كلمة المرور
              </button>
            </motion.form>
          )}
        </div>
      </section>

      {/* Two-Factor Authentication */}
      <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              is2FAEnabled ? "bg-green-500/10" : "bg-slate-500/10"
            )}>
              {isLoading2FA ? (
                <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
              ) : is2FAEnabled ? (
                <ShieldCheck className="h-6 w-6 text-green-400" />
              ) : (
                <Shield className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white">المصادقة الثنائية (2FA)</h3>
              <p className="text-sm text-slate-400">
                {isLoading2FA ? 'جاري التحميل...' : 
                 is2FAEnabled ? 'مفعّلة - حسابك محمي بطبقة إضافية' : 
                 'إضافة طبقة حماية إضافية لحسابك'}
              </p>
            </div>
          </div>
          <button 
            onClick={handle2FAToggle}
            disabled={isLoading2FA || isDisabling2FA}
            className={cn(
              "px-4 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50",
              is2FAEnabled 
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            )}
          >
            {isDisabling2FA ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : is2FAEnabled ? (
              <>
                <ShieldX className="h-4 w-4" />
                تعطيل
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                تفعيل
              </>
            )}
          </button>
        </div>
        {is2FAEnabled && (
          <div className="mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-300">المصادقة الثنائية مفعّلة</p>
              <p className="text-xs text-green-400/70 mt-1">
                سيُطلب منك رمز التحقق عند تسجيل الدخول من أجهزة جديدة
              </p>
            </div>
          </div>
        )}
      </section>
      {/* Phone Verification */}
      <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              user?.phoneVerified ? "bg-indigo-500/10" : "bg-yellow-500/10"
            )}>
              {user?.phoneVerified ? (
                <Smartphone className="h-6 w-6 text-indigo-400" />
              ) : (
                <Smartphone className="h-6 w-6 text-yellow-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white">تحقق رقم الهاتف</h3>
              <p className="text-sm text-slate-400">
                {user?.phoneVerified ? `مفعل: ${user?.phone}` : 'لم يتم التحقق من رقم الهاتف بعد'}
              </p>
            </div>
          </div>
          {!user?.phoneVerified && (
            <button 
              onClick={() => setShowPhoneModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors text-sm font-medium"
            >
              تحقق الآن
            </button>
          )}
          {user?.phoneVerified && (
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              تم التحقق
            </div>
          )}
        </div>
        {!user?.phoneVerified && (
          <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-500/80">
              التحقق من رقم الهاتف يحمي حسابك ويسمح لنا بالتواصل معك بخصوص الدروس والمهام الهامة.
            </p>
          </div>
        )}
      </section>

      
      {/* Security Log Summary */}
      <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
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

      {/* Danger Zone - Delete Account */}
      <section className="rounded-2xl bg-red-500/5 border border-red-500/20 overflow-hidden">
        <div className="p-4 border-b border-red-500/20 bg-red-500/10">
          <h3 className="font-semibold text-red-400 flex items-center gap-2">
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

      {/* 2FA Setup Modal */}
      <TwoFactorSetupModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        onSuccess={handle2FASuccess}
      />
      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={() => {
          setShowPhoneModal(false);
          refreshUser();
        }}
        initialPhone={user?.phone || ''}
      />
    </div>
  );
}
