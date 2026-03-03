'use client';

/**
 * ًں”” طµظپط­ط© ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ - Notifications Settings
 * 
 * طھط®طµظٹطµ ط¬ظ…ظٹط¹ ط£ظ†ظˆط§ط¹ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ ظ…ط¹:
 * - ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„ظ…ظ‡ط§ظ… ظˆط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ
 * - ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„ط£ظ…ط§ظ†
 * - ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„طھط­ط¯ظٹط«ط§طھ
 * - ظ‚ظ†ظˆط§طھ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ (Push, Email, SMS)
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Loader2,
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
} from '@/types/settings-preferences';
import {
  fetchSettingsPreferences,
  saveSettingsPreferences,
} from '@/app/(dashboard)/settings/preferences-client';

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
        setSettings(preferences.notifications);
      } catch {
        if (!mounted) return;
        setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS });
        toast.error('ظپط´ظ„ طھط­ظ…ظٹظ„ ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ');
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
      setSettings(updatedPreferences.notifications);
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
        icon={Bell}
        title="ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ"
        description="طھط®طµظٹطµ ط§ظ„طھظ†ط¨ظٹظ‡ط§طھ ظˆط§ظ„ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„طھظٹ طھطµظ„ظƒ"
        actionButton={
          hasChanges
            ? {
                label: 'ط­ظپط¸ ط§ظ„طھط؛ظٹظٹط±ط§طھ',
                onClick: handleSave,
                loading: isSaving,
                variant: 'primary',
                icon: Check,
              }
            : undefined
        }
      />

      {/* Notification Channels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-400" />
          ظ‚ظ†ظˆط§طھ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ
        </h3>
        
        <div className="grid sm:grid-cols-3 gap-4">
          <ChannelCard
            icon={BellRing}
            title="ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„طھط·ط¨ظٹظ‚"
            description="ط¥ط´ط¹ط§ط±ط§طھ ظپظˆط±ظٹط© ط¹ظ„ظ‰ ط¬ظ‡ط§ط²ظƒ"
            enabled={settings.pushEnabled}
            onToggle={(v) => updateSetting('pushEnabled', v)}
            color="indigo"
          />
          <ChannelCard
            icon={Mail}
            title="ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ"
            description="طھظ„ظ‚ظٹ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ ط¹ط¨ط± ط§ظ„ط¨ط±ظٹط¯"
            enabled={settings.emailEnabled}
            onToggle={(v) => updateSetting('emailEnabled', v)}
            color="purple"
          />
          <ChannelCard
            icon={MessageSquare}
            title="ط§ظ„ط±ط³ط§ط¦ظ„ ط§ظ„ظ†طµظٹط©"
            description="ط¥ط´ط¹ط§ط±ط§طھ SMS ظ…ظ‡ظ…ط©"
            enabled={settings.smsEnabled}
            onToggle={(v) => updateSetting('smsEnabled', v)}
            color="pink"
          />
        </div>
      </motion.div>

      {/* Study & Tasks */}
      <SettingsSection
        icon={BookOpen}
        title="ط§ظ„ط¯ط±ط§ط³ط© ظˆط§ظ„ظ…ظ‡ط§ظ…"
        description="ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„ظ…ظ‡ط§ظ… ظˆط§ظ„طھط°ظƒظٹط±ط§طھ ط§ظ„ط¯ط±ط§ط³ظٹط©"
      >
        <SettingsToggle
          icon={Clock}
          title="طھط°ظƒظٹط±ط§طھ ط§ظ„ظ…ظ‡ط§ظ…"
          description="طھظ„ظ‚ظٹ ط¥ط´ط¹ط§ط± ظ‚ط¨ظ„ ظ…ظˆط¹ط¯ ط§ظ„ظ…ظ‡ظ…ط©"
          enabled={settings.taskReminders}
          onToggle={(v) => updateSetting('taskReminders', v)}
        />
        {settings.taskReminders && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mr-12 mb-4"
          >
            <label className="text-sm text-slate-400">ط§ظ„طھط°ظƒظٹط± ظ‚ط¨ظ„</label>
            <select
              value={settings.taskReminderTime}
              onChange={(e) => updateSetting('taskReminderTime', e.target.value)}
              className="mt-1 w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value="15" className="bg-slate-800">15 ط¯ظ‚ظٹظ‚ط©</option>
              <option value="30" className="bg-slate-800">30 ط¯ظ‚ظٹظ‚ط©</option>
              <option value="60" className="bg-slate-800">ط³ط§ط¹ط© ظˆط§ط­ط¯ط©</option>
              <option value="120" className="bg-slate-800">ط³ط§ط¹طھظٹظ†</option>
              <option value="1440" className="bg-slate-800">ظٹظˆظ… ظˆط§ط­ط¯</option>
            </select>
          </motion.div>
        )}
        
        <SettingsToggle
          icon={Zap}
          title="طھط°ظƒظٹط±ط§طھ ط§ظ„ط¯ط±ط§ط³ط©"
          description="طھط°ظƒظٹط± ط¨ظˆظ‚طھ ط§ظ„ط¯ط±ط§ط³ط© ط§ظ„ظ…ط­ط¯ط¯"
          enabled={settings.studyReminders}
          onToggle={(v) => updateSetting('studyReminders', v)}
        />
        
        <SettingsToggle
          icon={Trophy}
          title="ط§ظ„ط£ظ‡ط¯ط§ظپ ط§ظ„ظٹظˆظ…ظٹط©"
          description="طھط°ظƒظٹط± ط¨طھط­ظ‚ظٹظ‚ ط§ظ„ط£ظ‡ط¯ط§ظپ ط§ظ„ظٹظˆظ…ظٹط©"
          enabled={settings.dailyGoalReminders}
          onToggle={(v) => updateSetting('dailyGoalReminders', v)}
        />
      </SettingsSection>

      {/* Exams & Deadlines */}
      <SettingsSection
        icon={Calendar}
        title="ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ظˆط§ظ„ظ…ظˆط§ط¹ظٹط¯"
        description="طھط°ظƒظٹط±ط§طھ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ظˆط§ظ„ظ…ظˆط§ط¹ظٹط¯ ط§ظ„ظ‡ط§ظ…ط©"
      >
        <SettingsToggle
          icon={Calendar}
          title="طھط°ظƒظٹط±ط§طھ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ"
          description="ط¥ط´ط¹ط§ط± ظ‚ط¨ظ„ ظ…ظˆط¹ط¯ ط§ظ„ط§ظ…طھط­ط§ظ†"
          enabled={settings.examReminders}
          onToggle={(v) => updateSetting('examReminders', v)}
        />
        {settings.examReminders && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mr-12 mb-4"
          >
            <label className="text-sm text-slate-400">ط§ظ„طھط°ظƒظٹط± ظ‚ط¨ظ„</label>
            <select
              value={settings.examReminderDays}
              onChange={(e) => updateSetting('examReminderDays', Number(e.target.value))}
              className="mt-1 w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value={1} className="bg-slate-800">ظٹظˆظ… ظˆط§ط­ط¯</option>
              <option value={3} className="bg-slate-800">3 ط£ظٹط§ظ…</option>
              <option value={7} className="bg-slate-800">ط£ط³ط¨ظˆط¹</option>
            </select>
          </motion.div>
        )}
        
        <SettingsToggle
          icon={AlertTriangle}
          title="طھط°ظƒظٹط±ط§طھ ط§ظ„ظ…ظˆط§ط¹ظٹط¯ ط§ظ„ظ†ظ‡ط§ط¦ظٹط©"
          description="طھظ†ط¨ظٹظ‡ ط¹ظ†ط¯ ط§ظ‚طھط±ط§ط¨ ط§ظ„ظ…ظˆط§ط¹ظٹط¯ ط§ظ„ظ†ظ‡ط§ط¦ظٹط©"
          enabled={settings.deadlineReminders}
          onToggle={(v) => updateSetting('deadlineReminders', v)}
        />
      </SettingsSection>

      {/* Progress & Achievements */}
      <SettingsSection
        icon={Trophy}
        title="ط§ظ„طھظ‚ط¯ظ… ظˆط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ"
        description="طھظ‚ط§ط±ظٹط± ط§ظ„طھظ‚ط¯ظ… ظˆط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ"
      >
        <SettingsToggle
          icon={Trophy}
          title="ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„ط¥ظ†ط¬ط§ط²ط§طھ"
          description="طھظ„ظ‚ظٹ ط¥ط´ط¹ط§ط± ط¹ظ†ط¯ طھط­ظ‚ظٹظ‚ ط¥ظ†ط¬ط§ط² ط¬ط¯ظٹط¯"
          enabled={settings.achievementAlerts}
          onToggle={(v) => updateSetting('achievementAlerts', v)}
        />
        
        <SettingsToggle
          icon={Calendar}
          title="ط§ظ„طھظ‚ط±ظٹط± ط§ظ„ط£ط³ط¨ظˆط¹ظٹ"
          description="ظ…ظ„ط®طµ ط£ط³ط¨ظˆط¹ظٹ ظ„طھظ‚ط¯ظ…ظƒ ط§ظ„ط¯ط±ط§ط³ظٹ"
          enabled={settings.weeklyReport}
          onToggle={(v) => updateSetting('weeklyReport', v)}
        />
      </SettingsSection>

      {/* Security removed */}


      {/* Social */}
      <SettingsSection
        icon={Users}
        title="ط§ظ„طھظپط§ط¹ظ„ ط§ظ„ط§ط¬طھظ…ط§ط¹ظٹ"
        description="ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„طھط¹ظ„ظٹظ‚ط§طھ ظˆط§ظ„ط¥ط´ط§ط±ط§طھ"
      >
        <SettingsToggle
          icon={MessageSquare}
          title="ط§ظ„طھط¹ظ„ظٹظ‚ط§طھ"
          description="ط¥ط´ط¹ط§ط± ط¹ظ†ط¯ طھظ„ظ‚ظٹ طھط¹ظ„ظٹظ‚ ط¬ط¯ظٹط¯"
          enabled={settings.commentNotifications}
          onToggle={(v) => updateSetting('commentNotifications', v)}
        />
        
        <SettingsToggle
          icon={Users}
          title="ط§ظ„ط¥ط´ط§ط±ط§طھ"
          description="ط¥ط´ط¹ط§ط± ط¹ظ†ط¯ ط§ظ„ط¥ط´ط§ط±ط© ط¥ظ„ظٹظƒ"
          enabled={settings.mentionNotifications}
          onToggle={(v) => updateSetting('mentionNotifications', v)}
        />
      </SettingsSection>

      {/* Sound & Quiet Hours */}
      <SettingsSection
        icon={Volume2}
        title="ط§ظ„طµظˆطھ ظˆط£ظˆظ‚ط§طھ ط§ظ„ط±ط§ط­ط©"
        description="ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط£طµظˆط§طھ ظˆظپطھط±ط§طھ ط¹ط¯ظ… ط§ظ„ط¥ط²ط¹ط§ط¬"
      >
        <SettingsToggle
          icon={settings.soundEnabled ? Volume2 : VolumeX}
          title="ط£طµظˆط§طھ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ"
          description="طھط´ط؛ظٹظ„ طµظˆطھ ط¹ظ†ط¯ طھظ„ظ‚ظٹ ط¥ط´ط¹ط§ط±"
          enabled={settings.soundEnabled}
          onToggle={(v) => updateSetting('soundEnabled', v)}
        />
        
        <SettingsToggle
          icon={Smartphone}
          title="ط§ظ„ط§ظ‡طھط²ط§ط²"
          description="ط§ظ‡طھط²ط§ط² ط§ظ„ط¬ظ‡ط§ط² ط¹ظ†ط¯ طھظ„ظ‚ظٹ ط¥ط´ط¹ط§ط±"
          enabled={settings.vibrationEnabled}
          onToggle={(v) => updateSetting('vibrationEnabled', v)}
        />
        
        <SettingsToggle
          icon={Moon}
          title="ط£ظˆظ‚ط§طھ ط§ظ„ط±ط§ط­ط©"
          description="ط¥ظٹظ‚ط§ظپ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ ظپظٹ ط£ظˆظ‚ط§طھ ظ…ط­ط¯ط¯ط©"
          enabled={settings.quietHoursEnabled}
          onToggle={(v) => updateSetting('quietHoursEnabled', v)}
        />
        
        {settings.quietHoursEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mr-12 grid grid-cols-2 gap-4"
          >
            <div>
              <label className="text-sm text-slate-400 flex items-center gap-1">
                <Moon className="h-3 w-3" /> ظ…ظ†
              </label>
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                className="mt-1 w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 flex items-center gap-1">
                <Sun className="h-3 w-3" /> ط¥ظ„ظ‰
              </label>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                className="mt-1 w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
          </motion.div>
        )}
      </SettingsSection>
    </div>
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
  color: 'indigo' | 'purple' | 'pink';
}) {
  const colorClasses = {
    indigo: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'rounded-xl p-4 border transition-all cursor-pointer',
        enabled
          ? `bg-gradient-to-br ${colorClasses[color]}`
          : 'bg-white/5 border-white/10'
      )}
      onClick={() => onToggle(!enabled)}
    >
      <div className="flex items-start justify-between">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          enabled ? 'bg-white/20' : 'bg-white/5'
        )}>
          <Icon className={cn('h-5 w-5', enabled ? 'text-white' : 'text-slate-400')} />
        </div>
        <ToggleSwitch enabled={enabled} onToggle={onToggle} />
      </div>
      <h4 className={cn('font-medium mt-3', enabled ? 'text-white' : 'text-slate-300')}>
        {title}
      </h4>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </motion.div>
  );
}


