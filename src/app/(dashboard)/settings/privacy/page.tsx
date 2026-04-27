'use client';

/**
 * صفحة إعدادات الخصوصية - Privacy Settings
 * 
 * إعدادات الخصوصية مع:
 * - خصوصية الملف الشخصي
 * - إدارة البيانات
 * - سجل النشاط
 * - حذف الحساب
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from "framer-motion";
import {
  Lock,
  Eye,
  Users,
  Shield,
  Download,
  Trash2,
  History,
  AlertTriangle,
  Loader2,
  Check,
  ChevronDown,
  FileText,
  UserX,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SettingsHeader, SettingsCard, SettingsToggle } from '@/app/(dashboard)/settings/components';
import { useAuth } from '@/contexts/auth-context';
import { useSettingsSync } from '@/hooks/use-settings-sync';
import {
  DEFAULT_PRIVACY_SETTINGS,
  type PrivacySettingsPreference,
} from '@/types/user-ui-preferences';
import {
  fetchSettingsPreferences,
  saveSettingsPreferences,
} from '@/app/(dashboard)/settings/preferences-client';

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { applySettingsFromPreferences } = useSettingsSync();
  const [settings, setSettings] = useState<PrivacySettingsPreference>({ ...DEFAULT_PRIVACY_SETTINGS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const preferences = await fetchSettingsPreferences();
        if (!mounted) return;
        setSettings(preferences.privacy);
        // Apply any settings that affect the UI
        applySettingsFromPreferences(preferences);
      } catch {
        if (!mounted) return;
        setSettings({ ...DEFAULT_PRIVACY_SETTINGS });
        toast.error('فشل تحميل إعدادات الخصوصية');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [applySettingsFromPreferences]);

  const updateSetting = <K extends keyof PrivacySettingsPreference>(
    key: K,
    value: PrivacySettingsPreference[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedPreferences = await saveSettingsPreferences({
        privacy: settings,
      });
      setSettings(updatedPreferences.privacy);
      toast.success('تم حفظ إعدادات الخصوصية');
      setHasChanges(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الإعدادات';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      const response = await fetch('/api/settings/privacy/actions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export-data' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to export data' }));
        throw new Error(payload.error || 'Failed to export data');
      }

      const payload = (await response.json()) as { exportData: unknown };
      const blob = new Blob([JSON.stringify(payload.exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `account-data-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success('تم تجهيز نسخة من بياناتك وتحميلها');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تنزيل البيانات';
      toast.error(message);
    }
  };

  const handleClearHistory = async () => {
    try {
      const response = await fetch('/api/settings/privacy/actions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-history' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to clear history' }));
        throw new Error(payload.error || 'Failed to clear history');
      }

      const payload = (await response.json()) as { deletedCount?: number };
      const deletedCount = payload.deletedCount ?? 0;
      toast.success(`تم حذف ${deletedCount} سجل من نشاط الأمان`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء مسح السجل';
      toast.error(message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      toast.error('لا يمكن حذف الحساب الآن');
      return;
    }

    setIsDeletingAccount(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to delete account' }));
        throw new Error(payload.error || 'Failed to delete account');
      }

      toast.success('تم حذف الحساب بنجاح');
      setShowDeleteConfirm(false);
      await logout(true);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف الحساب';
      toast.error(message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <SettingsHeader
        icon={Lock}
        title="الخصوصية"
        description="إدارة خصوصية حسابك وبياناتك"
        actionButton={
          hasChanges
            ? {
                label: 'حفظ التغييرات',
                onClick: handleSave,
                loading: isSaving,
                variant: 'primary',
                icon: Check,
              }
            : undefined
        }
      />

      {/* Profile Visibility */}
      <SettingsCard>
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-400" />
            ٪ور الملف الشخصي
          </h3>
          <p className="text-xs text-slate-400 mt-1">من يمكنه رؤية ملفك الشخصي</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'public', label: 'الجميع', icon: Globe, description: 'أي شخص يمكنه رؤية ملفك' },
              { value: 'friends', label: 'الأصدقاء', icon: Users, description: 'الأصدقاء فقط' },
              { value: 'private', label: 'خاص', icon: Lock, description: 'أنت فقط' },
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = settings.profileVisibility === option.value;
              
              return (
                <m.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateSetting('profileVisibility', option.value as PrivacySettingsPreference['profileVisibility'])}
                  className={cn(
                    'relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-all',
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl',
                    isSelected ? 'bg-indigo-500/30' : 'bg-white/10'
                  )}>
                    <Icon className={cn('h-6 w-6', isSelected ? 'text-indigo-400' : 'text-slate-400')} />
                  </div>
                  
                  <span className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-300')}>
                    {option.label}
                  </span>
                  <span className="text-xs text-slate-500 text-center">{option.description}</span>
                  
                  {isSelected && (
                    <div className="absolute top-2 left-2">
                      <Check className="h-5 w-5 text-indigo-400" />
                    </div>
                  )}
                </m.button>
              );
            })}
          </div>
        </div>
      </SettingsCard>

      {/* Activity Visibility */}
      <SettingsCard delay={0.1}>
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            إ٪ار النشاط
          </h3>
          <p className="text-xs text-slate-400 mt-1">التحكم في ما يراه الآخرون عنك</p>
        </div>
        
        <div className="p-4 space-y-2">
          <SettingsToggle
            icon={Eye}
            title="حالة الاتصال"
            description="إ٪ار أنك متصل الآن"
            enabled={settings.showOnlineStatus}
            onToggle={(v) => updateSetting('showOnlineStatus', v)}
          />
          
          <SettingsToggle
            icon={History}
            title="آخر ٪ور"
            description="إ٪ار وقت آخر نشاط لك"
            enabled={settings.showLastSeen}
            onToggle={(v) => updateSetting('showLastSeen', v)}
          />
          
          <SettingsToggle
            icon={Eye}
            title="التقدم الدراسي"
            description="إ٪ار نسبة إكمال الدورات"
            enabled={settings.showProgress}
            onToggle={(v) => updateSetting('showProgress', v)}
          />
          
          <SettingsToggle
            icon={Shield}
            title="الإنجازات"
            description="إ٪ار شاراتك وإنجازاتك"
            enabled={settings.showAchievements}
            onToggle={(v) => updateSetting('showAchievements', v)}
          />
        </div>
      </SettingsCard>
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            التواصل
          </h3>
          <p className="text-xs text-slate-400 mt-1">من يمكنه التواصل معك</p>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">من يمكنه مراسلتك</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'everyone', label: 'الجميع' },
                { value: 'friends', label: 'الأصدقاء فقط' },
                { value: 'none', label: 'لا أحد' },
              ].map((option) => {
                const isSelected = settings.allowMessages === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => updateSetting('allowMessages', option.value as PrivacySettingsPreference['allowMessages'])}
                    className={cn(
                      'p-3 rounded-xl border transition-all text-center',
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          <SettingsToggle
            icon={Users}
            title="طلبات الصداقة"
            description="السماح للآخرين بإرسال طلبات صداقة"
            enabled={settings.allowFriendRequests}
            onToggle={(v) => updateSetting('allowFriendRequests', v)}
          />
        </div>
      </m.div>

      {/* Data & Analytics */}
      <SettingsCard delay={0.3}>
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            البيانات والتحليلات
          </h3>
          <p className="text-xs text-slate-400 mt-1">إدارة كيفية استخدام بياناتك</p>
        </div>
        
        <div className="p-4 space-y-2">
          <SettingsToggle
            icon={FileText}
            title="جمع البيانات"
            description="السماح بجمع بيانات الاستخدام لتحسين الخدمة"
            enabled={settings.dataCollection}
            onToggle={(v) => updateSetting('dataCollection', v)}
          />
          
          <SettingsToggle
            icon={Shield}
            title="التخصيص"
            description="استخدام بياناتك لتخصيص التجربة"
            enabled={settings.personalization}
            onToggle={(v) => updateSetting('personalization', v)}
          />
          
          <SettingsToggle
            icon={History}
            title="التحليلات"
            description="المشاركة في تحسين المنتج"
            enabled={settings.analytics}
            onToggle={(v) => updateSetting('analytics', v)}
          />
        </div>
      </SettingsCard>

      {/* Data Management */}
      <SettingsCard delay={0.4}>
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Download className="h-5 w-5 text-indigo-400" />
            إدارة البيانات
          </h3>
          <p className="text-xs text-slate-400 mt-1">تنزيل أو حذف بياناتك</p>
        </div>
        
        <div className="p-4 space-y-4">
          <button
            onClick={handleDownloadData}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                <Download className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="text-right">
                <p className="font-medium text-white">تنزيل بياناتي</p>
                <p className="text-xs text-slate-400">احصل على نسخة من جميع بياناتك</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-slate-400" />
          </button>
          
          <button
            onClick={handleClearHistory}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                <History className="h-5 w-5 text-orange-400" />
              </div>
              <div className="text-right">
                <p className="font-medium text-white">مسح سجل النشاط</p>
                <p className="text-xs text-slate-400">حذف سجل البحث والتصفح</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </SettingsCard>

      {/* Danger Zone */}
      <SettingsCard delay={0.5} className="bg-red-500/10 border-red-500/30">
        <div className="p-4 border-b border-red-500/30">
          <h3 className="font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            منطقة الخطر
          </h3>
          <p className="text-xs text-red-400/80 mt-1">إجراءات لا يمكن التراجع عنها</p>
        </div>
        
        <div className="p-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                <UserX className="h-5 w-5 text-red-400" />
              </div>
              <div className="text-right">
                <p className="font-medium text-red-400">حذف الحساب نهائياً</p>
                <p className="text-xs text-red-400/70">سيتم حذف جميع بياناتك بشكل نهائي</p>
              </div>
            </div>
            <Trash2 className="h-5 w-5 text-red-400" />
          </button>
        </div>
      </SettingsCard>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-red-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">تأكيد حذف الحساب</h3>
                    <p className="text-sm text-slate-400">هذا الإجراء لا يمكن التراجع عنه</p>
                  </div>
                </div>
                
                <p className="text-slate-300 mb-6">
                  سيتم حذف جميع بياناتك بشكل نهائي، بما في ذلك:
                </p>
                
                <ul className="space-y-2 mb-6 text-sm text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    جميع الدورات والتقدم المحرز
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    الإنجازات والشارات
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    المحادثات والرسائل
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    إعدادات الحساب
                  </li>
                </ul>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 p-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="flex-1 p-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDeletingAccount ? 'جاري الحذف...' : 'حذف الحساب'}
                  </button>
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}



