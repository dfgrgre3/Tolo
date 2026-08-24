'use client';

import { useAuth } from "@/hooks/use-auth";
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
import { m } from "framer-motion";
import {
  Lock,
  Eye,
  Users,
  Shield,
  Download,
  History,
  AlertTriangle,
  Check,
  ChevronDown,
  FileText,
  UserX,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SettingsHeader, SettingsCard, SettingsToggle, DeleteAccountDialog } from '@/app/(dashboard)/settings/components';
import { useSettingsSync } from '@/hooks/use-settings-sync';
import {
  DEFAULT_PRIVACY_SETTINGS,
  type PrivacySettingsPreference,
} from '@/types/user-ui-preferences';
import {
  fetchSettingsPreferences,
  saveSettingsPreferences,
} from '@/app/(dashboard)/settings/preferences-client';
import apiClient, { ApiError } from '@/lib/api/api-client';
import { PageContainer } from '@/components/ui/page-container';

import { LoadingState } from '../_components/loading-state';

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError || err instanceof Error) return err.message || fallback;
  return fallback;
}

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { applySettingsFromPreferences } = useSettingsSync();
  const [settings, setSettings] = useState<PrivacySettingsPreference>({ ...DEFAULT_PRIVACY_SETTINGS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
      const preferences = await fetchSettingsPreferences();
        if (!mounted) return;
        setSettings(preferences.privacy);
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
      toast.error(errorMessage(error, 'حدث خطأ أثناء حفظ الإعدادات'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      const payload = await apiClient.post<{ exportData: unknown }>('/api/settings/privacy/actions', {
        action: 'export-data',
      });
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
      toast.error(errorMessage(error, 'حدث خطأ أثناء تنزيل البيانات'));
    }
  };

  const handleClearHistory = async () => {
    try {
      const payload = await apiClient.post<{ deletedCount?: number }>('/api/settings/privacy/actions', {
        action: 'clear-history',
      });
      const deletedCount = payload.deletedCount ?? 0;
      toast.success(`تم حذف ${deletedCount} سجل من نشاط الأمان`);
    } catch (error) {
      toast.error(errorMessage(error, 'حدث خطأ أثناء مسح السجل'));
    }
  };

  // Delete account — shared flow with settings/security/page.tsx via DeleteAccountDialog,
  // calling the real self-service DELETE /api/auth/account route (not the
  // nonexistent /api/users/:id this page previously called).
  const handleDeleteAccount = async (password: string) => {
    setIsDeletingAccount(true);

    try {
      await apiClient.delete('/api/auth/account', {
        body: JSON.stringify({ password, confirmation: 'DELETE' }),
      });

      toast.success('تم حذف حسابك بنجاح');
      localStorage.clear();
      sessionStorage.clear();
      await logout();
      router.push('/');
    } catch (error) {
      toast.error(errorMessage(error, 'حدث خطأ أثناء حذف الحساب'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <PageContainer size="lg" spacing="none" className="space-y-8">
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
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            ظهور الملف الشخصي
          </h3>
          <p className="text-xs text-muted-foreground mt-1">من يمكنه رؤية ملفك الشخصي</p>
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
                      ? 'bg-primary/15 border-primary/50'
                      : 'bg-muted/30 border-border hover:bg-accent/50'
                  )}
                >
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl',
                    isSelected ? 'bg-primary/25' : 'bg-muted'
                  )}>
                    <Icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                  </div>

                  <span className={cn('font-medium', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">{option.description}</span>

                  {isSelected && (
                    <div className="absolute top-2 left-2">
                      <Check className="h-5 w-5 text-primary" />
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
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            إظهار النشاط
          </h3>
          <p className="text-xs text-muted-foreground mt-1">التحكم في ما يراه الآخرون عنك</p>
        </div>

        <div className="p-4 space-y-2">
          <SettingsToggle
            icon={Eye}
            title="حالة الاتصال"
            description="إظهار أنك متصل الآن"
            enabled={settings.showOnlineStatus}
            onToggle={(v) => updateSetting('showOnlineStatus', v)}
          />

          <SettingsToggle
            icon={History}
            title="آخر ظهور"
            description="إظهار وقت آخر نشاط لك"
            enabled={settings.showLastSeen ?? false}
            onToggle={(v) => updateSetting('showLastSeen', v)}
          />

          <SettingsToggle
            icon={Eye}
            title="التقدم الدراسي"
            description="إظهار نسبة إكمال الدورات"
            enabled={settings.showProgress}
            onToggle={(v) => updateSetting('showProgress', v)}
          />

          <SettingsToggle
            icon={Shield}
            title="الإنجازات"
            description="إظهار شاراتك وإنجازاتك"
            enabled={settings.showAchievements ?? false}
            onToggle={(v) => updateSetting('showAchievements', v)}
          />
        </div>
      </SettingsCard>
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-card/60 border border-border overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            التواصل
          </h3>
          <p className="text-xs text-muted-foreground mt-1">من يمكنه التواصل معك</p>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">من يمكنه مراسلتك</label>
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
                        ? 'bg-primary/15 border-primary/50 text-foreground'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-accent/50'
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
            enabled={settings.allowFriendRequests ?? false}
            onToggle={(v) => updateSetting('allowFriendRequests', v)}
          />
        </div>
      </m.div>

      {/* Data & Analytics */}
      <SettingsCard delay={0.3}>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            البيانات والتحليلات
          </h3>
          <p className="text-xs text-muted-foreground mt-1">إدارة كيفية استخدام بياناتك</p>
        </div>

        <div className="p-4 space-y-2">
          <SettingsToggle
            icon={FileText}
            title="جمع البيانات"
            description="السماح بجمع بيانات الاستخدام لتحسين الخدمة"
            enabled={settings.dataCollection ?? false}
            onToggle={(v) => updateSetting('dataCollection', v)}
          />

          <SettingsToggle
            icon={Shield}
            title="التخصيص"
            description="استخدام بياناتك لتخصيص التجربة"
            enabled={settings.personalization ?? false}
            onToggle={(v) => updateSetting('personalization', v)}
          />

          <SettingsToggle
            icon={History}
            title="التحليلات"
            description="المشاركة في تحسين المنتج"
            enabled={settings.analytics ?? false}
            onToggle={(v) => updateSetting('analytics', v)}
          />
        </div>
      </SettingsCard>

      {/* Data Management */}
      <SettingsCard delay={0.4}>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            إدارة البيانات
          </h3>
          <p className="text-xs text-muted-foreground mt-1">تنزيل أو حذف بياناتك</p>
        </div>

        <div className="p-4 space-y-4">
          <button
            onClick={handleDownloadData}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">تنزيل بياناتي</p>
                <p className="text-xs text-muted-foreground">احصل على نسخة من جميع بياناتك</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={handleClearHistory}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15">
                <History className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">مسح سجل النشاط</p>
                <p className="text-xs text-muted-foreground">حذف سجل البحث والتصفح</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </SettingsCard>

      {/* Danger Zone */}
      <SettingsCard delay={0.5} className="bg-destructive/10 border-destructive/30">
        <div className="p-4 border-b border-destructive/30">
          <h3 className="font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            منطقة الخطر
          </h3>
          <p className="text-xs text-destructive/80 mt-1">إجراءات لا يمكن التراجع عنها</p>
        </div>

        <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/15">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
            <div className="text-right">
              <p className="font-medium text-destructive">حذف الحساب نهائياً</p>
              <p className="text-xs text-destructive/70">سيتم حذف جميع بياناتك بشكل نهائي</p>
            </div>
          </div>
          <DeleteAccountDialog onConfirm={handleDeleteAccount} isDeleting={isDeletingAccount} requirePassword />
        </div>
      </SettingsCard>
    </PageContainer>
  );
}
