import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react';
import { TimeSettingsData } from './TimeSettings';

interface TimerSettingsCardProps {
  settings: TimeSettingsData;
}

export function TimerSettingsCard({ settings }: TimerSettingsCardProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          إعدادات المؤقت
        </CardTitle>
        <CardDescription>تعديل إعدادات بومودورو</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">مدة العمل</span>
            <Badge variant="outline">{settings.pomodoroWorkMinutes} دقيقة</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">مدة الاستراحة</span>
            <Badge variant="outline">{settings.pomodoroBreakMinutes} دقيقة</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">الصوت</span>
            <Badge variant={settings.soundEnabled ? "default" : "outline"}>
              {settings.soundEnabled ? 'مفعل' : 'معطل'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">البدء التلقائي</span>
            <Badge variant={settings.autoStartBreak ? "default" : "outline"}>
              {settings.autoStartBreak ? 'مفعل' : 'معطل'}
            </Badge>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => {
              // Open settings modal
              if (typeof window !== 'undefined') {
                document.dispatchEvent(new CustomEvent('open-time-settings'));
              }
            }}
          >
            <Settings className="h-4 w-4 ml-2" />
            تعديل الإعدادات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
