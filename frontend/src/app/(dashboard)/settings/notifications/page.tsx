'use client';

/**
 * 🔔 صفحة إعدادات الإشعارات - Notifications Settings
 * 
 * تخصيص جميع أنواع الإشعارات مع:
 * - إشعارات المهام والامتحانات
 * - إشعارات الأمان
 * - إشعارات التحديثات
 * - قنوات الإشعارات (Push, Email, SMS)
 */

import { useState, useEffect } from 'react';
import { m } from "framer-motion";
import {
  Bell,
  BellRing,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Calendar,
  Zap,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Check,
  Settings,
  BookOpen,
  Trophy,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SettingsHeader, SettingsSection, SettingsToggle, ToggleSwitch } from '@/app/(dashboard)/settings/components';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettingsPreference,
} from '@/types/user-ui-preferences';
import {
  fetchSettingsPreferences,
  saveSettingsPreferences,
} from '@/app/(dashboard)/settings/preferences-client';
import { LoadingState } from '../_components/loading-state';
import { PageContainer } from '@/components/ui/page-container';

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettingsPreference>({ ...DEFAULT_NOTIFICATION_SETTINGS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const preferences = await fetchSettingsPreferences();
        if (!mounted) return;
        setSettings({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(preferences.notifications || {}),
        });
      } catch {
        if (!mounted) return;
        setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS });
        toast.error('فشل تحميل إعدادات الإشعارات');
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
  }, []);

  const updateSetting = <K extends keyof NotificationSettingsPreference>(
    key: K,
    value: NotificationSettingsPreference[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedPreferences = await saveSettingsPreferences({
        notifications: settings,
      });
      setSettings({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(updatedPreferences.notifications || {}),
      });
      toast.success('تم حفظ إعدادات الإشعارات');
      setHasChanges(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الإعدادات';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <PageContainer size="lg" spacing="none" className="space-y-8">
      {/* Header */}
      <SettingsHeader
        icon={Bell}
        title="الإشعارات"
        description="تخصيص التنبيهات والإشعارات التي تصلك"
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

      {/* Notification Channels */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/30 p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          قنوات الإشعارات
        </h3>
        
        <div className="grid sm:grid-cols-3 gap-4">
          <ChannelCard
            icon={BellRing}
            title="إشعارات التطبيق"
            description="إشعارات فورية على جهازك"
            enabled={settings.pushEnabled}
            onToggle={(v) => updateSetting('pushEnabled', v)}
            color="primary"
          />
          <ChannelCard
            icon={Mail}
            title="البريد الإلكتروني"
            description="تلقى الإشعارات عبر البريد"
            enabled={settings.emailEnabled}
            onToggle={(v) => updateSetting('emailEnabled', v)}
            color="accent"
          />
          <ChannelCard
            icon={MessageSquare}
            title="الرسائل النصية"
            description="إشعارات SMS مهمة"
            enabled={settings.smsEnabled}
            onToggle={(v) => updateSetting('smsEnabled', v)}
            color="pink"
          />
        </div>
      </m.div>

      {/* Study & Tasks */}
      <SettingsSection
        icon={BookOpen}
        title="الدراسة والمهام"
        description="إشعارات المهام والتذكيرات الدراسية"
      >
        <SettingsToggle
          icon={Clock}
          title="تذكيرات المهام"
          description="تلقى إشعار قبل موعد المهمة"
          enabled={settings.taskReminders}
          onToggle={(v) => updateSetting('taskReminders', v)}
        />
        {settings.taskReminders && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mr-12 mb-4"
          >
            <label className="text-sm text-muted-foreground">التذكير قبل</label>
            <select
              value={settings.taskReminderTime}
              onChange={(e) => updateSetting('taskReminderTime', e.target.value)}
              className="mt-1 w-full p-2 rounded-lg bg-background border border-input text-foreground text-sm"
            >
              <option value="15" className="bg-background text-foreground">15 دقيقة</option>
              <option value="30" className="bg-background text-foreground">30 دقيقة</option>
              <option value="60" className="bg-background text-foreground">ساعة واحدة</option>
              <option value="120" className="bg-background text-foreground">ساعتين</option>
              <option value="1440" className="bg-background text-foreground">يوم واحد</option>
            </select>
          </m.div>
        )}
        
        <SettingsToggle
          icon={Zap}
          title="تذكيرات الدراسة"
          description="تذكير بوقت الدراسة المحدد"
          enabled={settings.studyReminders}
          onToggle={(v) => updateSetting('studyReminders', v)}
        />
        
        <SettingsToggle
          icon={Trophy}
          title="الأهداف اليومية"
          description="تذكير بتحقيق الأهداف اليومية"
          enabled={settings.dailyGoalReminders}
          onToggle={(v) => updateSetting('dailyGoalReminders', v)}
        />
      </SettingsSection>

      {/* Exams & Deadlines */}
      <SettingsSection
        icon={Calendar}
        title="الامتحانات والمواعيد"
        description="تذكيرات الامتحانات والمواعيد الهامة"
      >
        <SettingsToggle
          icon={Calendar}
          title="تذكيرات الامتحانات"
          description="إشعار قبل موعد الامتحان"
          enabled={settings.examReminders}
          onToggle={(v) => updateSetting('examReminders', v)}
        />
        {settings.examReminders && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mr-12 mb-4"
          >
            <label className="text-sm text-muted-foreground">التذكير قبل</label>
            <select
              value={settings.examReminderDays}
              onChange={(e) => updateSetting('examReminderDays', Number(e.target.value))}
              className="mt-1 w-full p-2 rounded-lg bg-background border border-input text-foreground text-sm"
            >
              <option value={1} className="bg-background text-foreground">يوم واحد</option>
              <option value={3} className="bg-background text-foreground">3 أيام</option>
              <option value={7} className="bg-background text-foreground">أسبوع</option>
            </select>
          </m.div>
        )}
        
        <SettingsToggle
          icon={AlertTriangle}
          title="تذكيرات المواعيد النهائية"
          description="تنبيه عند اقتراب المواعيد النهائية"
          enabled={settings.deadlineReminders}
          onToggle={(v) => updateSetting('deadlineReminders', v)}
        />
      </SettingsSection>

      {/* Progress & Achievements */}
      <SettingsSection
        icon={Trophy}
        title="التقدم والإنجازات"
        description="تقارير التقدم والإنجازات"
      >
        <SettingsToggle
          icon={Trophy}
          title="إشعارات الإنجازات"
          description="تلقى إشعار عند تحقيق إنجاز جديد"
          enabled={settings.achievementAlerts}
          onToggle={(v) => updateSetting('achievementAlerts', v)}
        />
        
        <SettingsToggle
          icon={Calendar}
          title="التقرير الأسبوعي"
          description="ملخص أسبوعي لتقدمك الدراسي"
          enabled={settings.weeklyReport}
          onToggle={(v) => updateSetting('weeklyReport', v)}
        />
      </SettingsSection>

      {/* Security removed */}


      {/* Social */}
      <SettingsSection
        icon={Users}
        title="التفاعل الاجتماعي"
        description="إشعارات التعليقات والإشارات"
      >
        <SettingsToggle
          icon={MessageSquare}
          title="التعليقات"
          description="إشعار عند تلقي تعليق جديد"
          enabled={settings.commentNotifications}
          onToggle={(v) => updateSetting('commentNotifications', v)}
        />
        
        <SettingsToggle
          icon={Users}
          title="الإشارات"
          description="إشعار عند الإشارة إليك"
          enabled={settings.mentionNotifications}
          onToggle={(v) => updateSetting('mentionNotifications', v)}
        />
      </SettingsSection>

      {/* Sound & Quiet Hours */}
      <SettingsSection
        icon={Volume2}
        title="الصوت وأوقات الراحة"
        description="إعدادات الأصوات وفترات عدم الإزعاج"
      >
        <SettingsToggle
          icon={settings.soundEnabled ? Volume2 : VolumeX}
          title="أصوات الإشعارات"
          description="تشغيل صوت عند تلقي إشعار"
          enabled={settings.soundEnabled}
          onToggle={(v) => updateSetting('soundEnabled', v)}
        />
        
        <SettingsToggle
          icon={Smartphone}
          title="الاهتزاز"
          description="اهتزاز الجهاز عند تلقي إشعار"
          enabled={settings.vibrationEnabled}
          onToggle={(v) => updateSetting('vibrationEnabled', v)}
        />
        
        <SettingsToggle
          icon={Moon}
          title="أوقات الراحة"
          description="إيقاف الإشعارات في أوقات محددة"
          enabled={settings.quietHoursEnabled}
          onToggle={(v) => updateSetting('quietHoursEnabled', v)}
        />
        
        {settings.quietHoursEnabled && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mr-12 grid grid-cols-2 gap-4"
          >
            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-1">
                <Moon className="h-3 w-3" /> من
              </label>
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                className="mt-1 w-full p-2 rounded-lg bg-background border border-input text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-1">
                <Sun className="h-3 w-3" /> إلى
              </label>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                className="mt-1 w-full p-2 rounded-lg bg-background border border-input text-foreground text-sm"
              />
            </div>
          </m.div>
        )}
      </SettingsSection>
    </PageContainer>
  );
}

// Channel Card Component
function ChannelCard({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  color,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  color: 'primary' | 'accent' | 'pink';
}) {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/10 border-primary/30',
    accent: 'from-accent/20 to-accent/10 border-accent/30',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
  };

  return (
    <m.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'rounded-xl p-4 border transition-all cursor-pointer',
        enabled
          ? `bg-gradient-to-br ${colorClasses[color]}`
          : 'bg-muted/30 border-border'
      )}
      onClick={() => onToggle(!enabled)}
    >
      <div className="flex items-start justify-between">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          enabled ? 'bg-background/40' : 'bg-muted/50'
        )}>
          <Icon className={cn('h-5 w-5', enabled ? 'text-foreground' : 'text-muted-foreground')} />
        </div>
        <ToggleSwitch enabled={enabled} onToggle={onToggle} />
      </div>
      <h4 className={cn('font-medium mt-3', enabled ? 'text-foreground' : 'text-muted-foreground')}>
        {title}
      </h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </m.div>
  );
}


