'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
// Token is in httpOnly cookie - no need to import getSafeAuthToken

import { logger } from '@/lib/logger';

export default function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // جلب إعدادات الإشعارات الحالية
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      setIsLoading(true);
      try {
        // Token is in httpOnly cookie - no need to send Authorization header
        const response = await fetch('/api/user/notification-settings', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to fetch notification settings');

        const data = await response.json();
        setEmailNotifications(data.emailNotifications);
        setSmsNotifications(data.smsNotifications);
        setPhoneNumber(data.phone || '');
      } catch (error) {
        logger.error('Error fetching notification settings:', error);
        toast.error('فشل في جلب إعدادات الإشعارات');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotificationSettings();
  }, []);

  // حفظ إعدادات الإشعارات
  const saveNotificationSettings = async () => {
    setIsSaving(true);
    try {
      // Token is in httpOnly cookie - no need to send Authorization header
      const response = await fetch('/api/user/notification-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          emailNotifications,
          smsNotifications,
          phone: phoneNumber,
        }),
      });

      if (!response.ok) throw new Error('Failed to save notification settings');

      toast.success('تم حفظ إعدادات الإشعارات بنجاح');
    } catch (error) {
      logger.error('Error saving notification settings:', error);
      toast.error('فشل في حفظ إعدادات الإشعارات');
    } finally {
      setIsSaving(false);
    }
  };

  // اختبار إشعار
  const testNotification = async (channel: 'email' | 'sms') => {
    try {
      // Token is in httpOnly cookie - no need to send Authorization header
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: 'رسالة اختبار',
          message: 'هذه رسالة اختبار للتحقق من إعدادات الإشعارات',
          channels: [channel],
        }),
      });

      if (!response.ok) throw new Error(`Failed to send ${channel} notification`);

      toast.success(`تم إرسال رسالة الاختبار عبر ${channel === 'email' ? 'البريد الإلكتروني' : 'الرسالة النصية'}`);
    } catch (error) {
      logger.error(`Error sending ${channel} notification:`, error);
      toast.error(`فشل في إرسال رسالة الاختبار عبر ${channel === 'email' ? 'البريد الإلكتروني' : 'الرسالة النصية'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الإشعارات</CardTitle>
          <CardDescription>
            اختر الطريقة التي تريد استلام الإشعارات بها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">البريد الإلكتروني</Label>
              <p className="text-sm text-muted-foreground">
                استلام الإشعارات عبر البريد الإلكتروني
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-notifications">الرسائل النصية (SMS)</Label>
                <p className="text-sm text-muted-foreground">
                  استلام الإشعارات عبر الرسائل النصية
                </p>
              </div>
              <Switch
                id="sms-notifications"
                checked={smsNotifications}
                onCheckedChange={setSmsNotifications}
              />
            </div>

            {smsNotifications && (
              <div className="space-y-2">
                <Label htmlFor="phone-number">رقم الهاتف</Label>
                <Input
                  id="phone-number"
                  placeholder="أدخل رقم الهاتف"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={saveNotificationSettings}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>

            {emailNotifications && (
              <Button
                variant="outline"
                onClick={() => testNotification('email')}
                disabled={isSaving}
              >
                اختبار البريد الإلكتروني
              </Button>
            )}

            {smsNotifications && phoneNumber && (
              <Button
                variant="outline"
                onClick={() => testNotification('sms')}
                disabled={isSaving}
              >
                اختبار الرسائل النصية
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </AuthGuard>
  );
}
