'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Bell, Clock, Target, Moon, Volume2, Zap, Timer } from 'lucide-react';
import { m } from 'framer-motion';
import { safeSetItem } from '@/lib/safe-client-utils';
import { useTimeTrackerStore } from '@/hooks/use-time-tracker-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimeSettingsProps {
  onSave?: (settings: TimeSettingsData) => void;
}

export interface TimeSettingsData {
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  defaultSessionDuration: number;
  breakDuration: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  autoStartBreak: boolean;
  pomodoroEnabled: boolean;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
}

function TimeSettings({ onSave }: TimeSettingsProps) {
  const { settings: globalSettings, updateSettings, userId } = useTimeTrackerStore();

  const [settings, setSettings] = useState<TimeSettingsData>({
    dailyGoalMinutes: 180,
    weeklyGoalMinutes: 1260,
    defaultSessionDuration: 30,
    breakDuration: 5,
    notificationsEnabled: true,
    soundEnabled: globalSettings.soundEnabled,
    theme: 'auto',
    autoStartBreak: globalSettings.autoStartBreak,
    pomodoroEnabled: true,
    pomodoroWorkMinutes: globalSettings.pomodoroWorkMinutes,
    pomodoroBreakMinutes: globalSettings.pomodoroBreakMinutes
  });

  // Sync with global store on mount/update
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      soundEnabled: globalSettings.soundEnabled,
      autoStartBreak: globalSettings.autoStartBreak,
      pomodoroWorkMinutes: globalSettings.pomodoroWorkMinutes,
      pomodoroBreakMinutes: globalSettings.pomodoroBreakMinutes
    }));
  }, [globalSettings]);

  const handleSave = () => {
    // 1. Save to global Zustand store
    updateSettings({
      pomodoroWorkMinutes: settings.pomodoroWorkMinutes,
      pomodoroBreakMinutes: settings.pomodoroBreakMinutes,
      soundEnabled: settings.soundEnabled,
      autoStartBreak: settings.autoStartBreak,
    });

    // 2. Save locally
    safeSetItem('timeSettings', settings);

    // 3. Sync to backend if user is logged in
    if (userId) {
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soundEnabled: settings.soundEnabled,
          notificationsEnabled: settings.notificationsEnabled,
          theme: settings.theme,
        })
      })
        .then(async (res) => {
          if (res.ok) {
            toast.success('تمت مزامنة الإعدادات مع حسابك بنجاح');
          } else {
            console.warn('Failed to sync settings to database:', res.statusText);
            toast.success('تم حفظ الإعدادات محلياً');
          }
        })
        .catch((err) => {
          console.warn('Error syncing settings to database:', err);
          toast.success('تم حفظ الإعدادات محلياً');
        });
    } else {
      toast.success('تم حفظ الإعدادات محلياً');
    }

    if (onSave) {
      onSave(settings);
    }
  };

  const cardClass = "rounded-3xl bg-[#0a1628]/60 border border-white/8 backdrop-blur-xl p-6";
  const labelClass = "text-sm text-white/60 font-medium";
  const inputClass = "bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-all";

  const sections = [
    {
      icon: <Target className="h-5 w-5 text-blue-400" />,
      title: 'الأهداف اليومية والأسبوعية',
      color: 'from-blue-500/10',
      fields: [
        {
          id: 'dailyGoal',
          label: 'الهدف اليومي (دقيقة)',
          type: 'number',
          value: settings.dailyGoalMinutes,
          min: 0, max: 1440,
          onChange: (v: number) => setSettings(s => ({ ...s, dailyGoalMinutes: v })),
        },
        {
          id: 'weeklyGoal',
          label: 'الهدف الأسبوعي (دقيقة)',
          type: 'number',
          value: settings.weeklyGoalMinutes,
          min: 0, max: 10080,
          onChange: (v: number) => setSettings(s => ({ ...s, weeklyGoalMinutes: v })),
        },
      ],
    },
    {
      icon: <Clock className="h-5 w-5 text-violet-400" />,
      title: 'مدة الجلسات والاستراحات',
      color: 'from-violet-500/10',
      fields: [
        {
          id: 'defaultDuration',
          label: 'مدة الجلسة الافتراضية (دقيقة)',
          type: 'number',
          value: settings.defaultSessionDuration,
          min: 5, max: 480,
          onChange: (v: number) => setSettings(s => ({ ...s, defaultSessionDuration: v })),
        },
        {
          id: 'breakDuration',
          label: 'مدة الاستراحة (دقيقة)',
          type: 'number',
          value: settings.breakDuration,
          min: 1, max: 60,
          onChange: (v: number) => setSettings(s => ({ ...s, breakDuration: v })),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 rtl" dir="rtl">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Settings className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">إعدادات الوقت</h2>
            <p className="text-xs text-white/40 mt-0.5">خصص تجربة المذاكرة بالكامل</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-2xl px-5 h-11 font-bold transition-all shadow-lg shadow-emerald-950/20"
        >
          <Save className="h-4 w-4" />
          حفظ الإعدادات
        </Button>
      </div>

      {/* Goal & Duration cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sections.map((section, si) => (
          <m.div
            key={si}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.08 }}
            className={cn(cardClass, 'relative overflow-hidden')}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none', section.color, 'to-transparent')} />
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/8">
                  {section.icon}
                </div>
                <h3 className="text-sm font-bold text-white">{section.title}</h3>
              </div>
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label htmlFor={field.id} className={labelClass}>{field.label}</Label>
                    <Input
                      id={field.id}
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      min={field.min}
                      max={field.max}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          </m.div>
        ))}
      </div>

      {/* Notifications & Appearance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Notifications */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className={cn(cardClass, 'relative overflow-hidden')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/8">
                <Bell className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white">الإشعارات</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/6 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 text-amber-400/70" />
                  <span className={labelClass}>تفعيل الإشعارات</span>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, notificationsEnabled: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/6 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="h-4 w-4 text-emerald-400/70" />
                  <span className={labelClass}>تفعيل الصوت</span>
                </div>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, soundEnabled: checked }))}
                />
              </div>
            </div>
          </div>
        </m.div>

        {/* Appearance */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className={cn(cardClass, 'relative overflow-hidden')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/8">
                <Moon className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-white">المظهر</h3>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="theme" className={labelClass}>سمة الواجهة</Label>
              <Select
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark' | 'auto') => setSettings(s => ({ ...s, theme: value }))}
              >
                <SelectTrigger id="theme" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1628] border border-white/10 text-white rounded-xl">
                  <SelectItem value="light" className="focus:bg-white/10 focus:text-white rounded-lg">فاتح</SelectItem>
                  <SelectItem value="dark" className="focus:bg-white/10 focus:text-white rounded-lg">داكن</SelectItem>
                  <SelectItem value="auto" className="focus:bg-white/10 focus:text-white rounded-lg">تلقائي (مثل النظام)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </m.div>
      </div>

      {/* Pomodoro Settings */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className={cn(cardClass, 'relative overflow-hidden')}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-50 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/8">
                <Timer className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">إعدادات بومودورو</h3>
                <p className="text-xs text-white/30 mt-0.5">تقنية إدارة الوقت الأكثر فاعلية</p>
              </div>
            </div>
            <Switch
              id="pomodoro"
              checked={settings.pomodoroEnabled}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, pomodoroEnabled: checked }))}
            />
          </div>

          {settings.pomodoroEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Work minutes */}
              <div className="p-4 rounded-2xl bg-rose-500/8 border border-rose-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-rose-400" />
                  <span className="text-xs font-bold text-rose-400">وقت الدراسة</span>
                </div>
                <Input
                  id="workMinutes"
                  type="number"
                  value={settings.pomodoroWorkMinutes}
                  onChange={(e) => setSettings(s => ({ ...s, pomodoroWorkMinutes: parseInt(e.target.value) || 25 }))}
                  min={1} max={120}
                  className="bg-white/5 border border-white/10 text-white text-center font-bold rounded-xl focus:ring-1 focus:ring-rose-500/50"
                />
                <p className="text-[10px] text-white/30 text-center">دقيقة</p>
              </div>

              {/* Break minutes */}
              <div className="p-4 rounded-2xl bg-teal-500/8 border border-teal-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-400" />
                  <span className="text-xs font-bold text-teal-400">استراحة قصيرة</span>
                </div>
                <Input
                  id="breakMinutes"
                  type="number"
                  value={settings.pomodoroBreakMinutes}
                  onChange={(e) => setSettings(s => ({ ...s, pomodoroBreakMinutes: parseInt(e.target.value) || 5 }))}
                  min={1} max={30}
                  className="bg-white/5 border border-white/10 text-white text-center font-bold rounded-xl focus:ring-1 focus:ring-teal-500/50"
                />
                <p className="text-[10px] text-white/30 text-center">دقيقة</p>
              </div>

              {/* Auto-start break */}
              <div className="p-4 rounded-2xl bg-violet-500/8 border border-violet-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-violet-400" />
                  <span className="text-xs font-bold text-violet-400">بدء تلقائي</span>
                </div>
                <div className="flex items-center justify-center h-10">
                  <Switch
                    id="autoBreak"
                    checked={settings.autoStartBreak}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, autoStartBreak: checked }))}
                  />
                </div>
                <p className="text-[10px] text-white/30 text-center">بدء الاستراحة تلقائياً</p>
              </div>
            </div>
          )}
        </div>
      </m.div>
    </div>
  );
}

export default TimeSettings;
