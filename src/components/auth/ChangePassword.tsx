'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { getPasswordStrengthDisplay } from './utils/password-strength';
import { parseApiError, handleNetworkError, createFetchWithTimeout } from './utils/error-handling';
import { getTokenFromStorage } from '@/lib/auth-client';

export default function ChangePassword() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(
    getPasswordStrengthDisplay('')
  );

  useEffect(() => {
    if (formData.newPassword) {
      setPasswordStrength(getPasswordStrengthDisplay(formData.newPassword));
    } else {
      setPasswordStrength(getPasswordStrengthDisplay(''));
    }
  }, [formData.newPassword]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من البيانات
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error('كلمة المرور يجب أن تكون على الأقل 8 أحرف');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error('كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية');
      return;
    }

    setIsLoading(true);

    try {
      const token = getTokenFromStorage();
      if (!token) {
        toast.error('غير مصرح، يرجى تسجيل الدخول مرة أخرى');
        setIsLoading(false);
        return;
      }

      const response = await createFetchWithTimeout(
        '/api/auth/change-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
          }),
        }
      );

      if (!response.ok) {
        const apiError = await parseApiError(response);
        toast.error(apiError?.error || 'فشل تغيير كلمة المرور');
        setIsLoading(false);
        return;
      }

      // Read response text first to check if it's HTML
      const text = await response.text();
      
      // Check if response is HTML (error page)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error('Server returned HTML instead of JSON');
        toast.error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        setIsLoading(false);
        return;
      }

      // Try to parse as JSON
      try {
        const data = JSON.parse(text);
        toast.success('تم تغيير كلمة المرور بنجاح');
        
        // مسح النموذج
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPasswordStrength(getPasswordStrengthDisplay(''));
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        toast.error('فشل في معالجة استجابة الخادم');
      }
    } catch (error) {
      const networkError = handleNetworkError(error);
      console.error('Change password error:', error);
      toast.error(networkError.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white">تغيير كلمة المرور</h2>
        <p className="mt-2 text-sm text-slate-300">
          أدخل كلمة المرور الحالية والجديدة
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Current Password */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            كلمة المرور الحالية
          </label>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type={showPasswords.current ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
              className="w-full rounded-xl bg-white/10 py-3 pr-12 pl-12 text-white placeholder-slate-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPasswords.current ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            كلمة المرور الجديدة
          </label>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type={showPasswords.new ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
              className="w-full rounded-xl bg-white/10 py-3 pr-12 pl-12 text-white placeholder-slate-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPasswords.new ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300">
                  {passwordStrength.label}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1 mt-2">
                <div className="flex items-center gap-2">
                  {passwordStrength.checks.minLength ? (
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-400" />
                  )}
                  <span>8 أحرف على الأقل</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.checks.hasUpper && passwordStrength.checks.hasLower ? (
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-400" />
                  )}
                  <span>أحرف كبيرة وصغيرة</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.checks.hasNumber ? (
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-400" />
                  )}
                  <span>أرقام</span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.checks.hasSpecial ? (
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-400" />
                  )}
                  <span>رمز خاص</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            تأكيد كلمة المرور الجديدة
          </label>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
              className="w-full rounded-xl bg-white/10 py-3 pr-12 pl-12 text-white placeholder-slate-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPasswords.confirm ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
            <p className="mt-1 text-xs text-red-400">كلمة المرور غير متطابقة</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              جارٍ تغيير كلمة المرور...
            </span>
          ) : (
            'تغيير كلمة المرور'
          )}
        </button>
      </form>
    </div>
  );
}

