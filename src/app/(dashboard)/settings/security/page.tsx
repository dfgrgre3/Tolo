'use client';

/**
 * 🔐 صفحة الأمان - Security Settings
 * 
 * إدارة أمان الحساب:
 * - تغيير كلمة المرور
 * - إدارة الجلسات
 * - التحقق بخطوتين
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Key, 
  Lock, 
  ChevronRight, 
  LogOut, 
  Smartphone, 
  History,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Monitor,
  Settings
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

export default function SecurityPage() {
  const { logout } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

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
            <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">المصادقة الثنائية (2FA)</h3>
              <p className="text-sm text-slate-400">إضافة طبقة حماية إضافية لحسابك</p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
            تفعيل
          </button>
        </div>
      </section>

      {/* Active Sessions */}
      <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-indigo-400" />
            الجلسات النشطة
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Windows • Chrome</p>
                <p className="text-xs text-slate-500">القاهرة، مصر • نشط الآن</p>
              </div>
            </div>
            <span className="px-2 py-1 rounded text-[10px] bg-green-500/20 text-green-400 uppercase font-bold">هذا الجهاز</span>
          </div>
          
          <button 
            onClick={() => logout(true)}
            className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج من جميع الأجهزة
          </button>
        </div>
      </section>

      {/* Security Log Summary */}
      <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            سجل النشاطات الأمنية
          </h3>
          <button className="text-sm text-indigo-400 hover:underline">عرض الكل</button>
        </div>
        <div className="space-y-4">
          {[
            { event: 'تسجيل دخول ناجح', time: 'منذ ساعتين', status: 'success' },
            { event: 'تغيير البريد الإلكتروني', time: 'أمس الساعة 10:30 م', status: 'warning' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {item.status === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                )}
                <span className="text-slate-300">{item.event}</span>
              </div>
              <span className="text-slate-500">{item.time}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
