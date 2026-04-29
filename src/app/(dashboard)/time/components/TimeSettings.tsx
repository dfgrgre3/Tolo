'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Bell, Clock, Target, Moon } from 'lucide-react';
import { safeSetItem } from '@/lib/safe-client-utils';

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
  const [settings, setSettings] = useState<TimeSettingsData>({
    dailyGoalMinutes: 180,
    weeklyGoalMinutes: 1260,
    defaultSessionDuration: 30,
    breakDuration: 5,
    notificationsEnabled: true,
    soundEnabled: true,
    theme: 'auto',
    autoStartBreak: false,
    pomodoroEnabled: false,
    pomodoroWorkMinutes: 25,
    pomodoroBreakMinutes: 5
  });

  const handleSave = () => {
    // Save to localStorage using safe wrapper
    safeSetItem('timeSettings', settings);
    if (onSave) {
      onSave(settings);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          إعدادات الوقت
        </h2>
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          حفظ الإعدادات
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Goals Settings */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30">
            <CardTitle className="flex items-center text-lg">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 ml-2" />
              الأهداف
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dailyGoal">الهدف اليومي (دقيقة)</Label>
              <Input
                id="dailyGoal"
                type="number"
                value={settings.dailyGoalMinutes}
                onChange={(e) => setSettings({
                  ...settings,
                  dailyGoalMinutes: parseInt(e.target.value) || 0
                })}
                min="0"
                max="1440"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weeklyGoal">الهدف الأسبوعي (دقيقة)</Label>
              <Input
                id="weeklyGoal"
                type="number"
                value={settings.weeklyGoalMinutes}
                onChange={(e) => setSettings({
                  ...settings,
                  weeklyGoalMinutes: parseInt(e.target.value) || 0
                })}
                min="0"
                max="10080"
              />
            </div>
          </CardContent>
        </Card>

        {/* Session Settings */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30">
            <CardTitle className="flex items-center text-lg">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400 ml-2" />
              إعدادات الجلسات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultDuration">مدة الجلسة الافتراضية (دقيقة)</Label>
              <Input
                id="defaultDuration"
                type="number"
                value={settings.defaultSessionDuration}
                onChange={(e) => setSettings({
                  ...settings,
                  defaultSessionDuration: parseInt(e.target.value) || 0
                })}
                min="5"
                max="480"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breakDuration">مدة الاستراحة (دقيقة)</Label>
              <Input
                id="breakDuration"
                type="number"
                value={settings.breakDuration}
                onChange={(e) => setSettings({
                  ...settings,
                  breakDuration: parseInt(e.target.value) || 0
                })}
                min="1"
                max="60"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications Settings */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/30">
            <CardTitle className="flex items-center text-lg">
              <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400 ml-2" />
              الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">تفعيل الإشعارات</Label>
              <Switch
                id="notifications"
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  notificationsEnabled: checked
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sound">تفعيل الصوت</Label>
              <Switch
                id="sound"
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  soundEnabled: checked
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/30">
            <CardTitle className="flex items-center text-lg">
              <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
              المظهر
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">المظهر</Label>
              <Select
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark' | 'auto') => setSettings({
                  ...settings,
                  theme: value
                })}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">فاتح</SelectItem>
                  <SelectItem value="dark">داكن</SelectItem>
                  <SelectItem value="auto">تلقائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pomodoro Settings */}
        <Card className="border-2 border-primary/10 md:col-span-2">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30">
            <CardTitle className="flex items-center text-lg">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400 ml-2" />
              إعدادات بومودورو
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pomodoro">تفعيل بومودورو</Label>
              <Switch
                id="pomodoro"
                checked={settings.pomodoroEnabled}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  pomodoroEnabled: checked
                })}
              />
            </div>
            {settings.pomodoroEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="workMinutes">مدة العمل (دقيقة)</Label>
                  <Input
                    id="workMinutes"
                    type="number"
                    value={settings.pomodoroWorkMinutes}
                    onChange={(e) => setSettings({
                      ...settings,
                      pomodoroWorkMinutes: parseInt(e.target.value) || 25
                    })}
                    min="1"
                    max="120"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breakMinutes">مدة الاستراحة (دقيقة)</Label>
                  <Input
                    id="breakMinutes"
                    type="number"
                    value={settings.pomodoroBreakMinutes}
                    onChange={(e) => setSettings({
                      ...settings,
                      pomodoroBreakMinutes: parseInt(e.target.value) || 5
                    })}
                    min="1"
                    max="30"
                  />
                </div>
                <div className="flex items-center justify-between md:col-span-2">
                  <Label htmlFor="autoBreak">بدء الاستراحة تلقائياً</Label>
                  <Switch
                    id="autoBreak"
                    checked={settings.autoStartBreak}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      autoStartBreak: checked
                    })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

