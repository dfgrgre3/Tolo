'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Shield, MapPin, AlertTriangle, CheckCircle2, X, Plus, Trash2, Globe, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { logger } from '@/lib/logger';

interface AdvancedProtectionProps {
  userId: string;
}

interface IPWhitelistEntry {
  id: string;
  ip: string;
  label?: string;
  createdAt: string;
}

export default function AdvancedProtection({ userId }: AdvancedProtectionProps) {
  const [recaptchaEnabled, setRecaptchaEnabled] = useState(false);
  const [geographicSecurityEnabled, setGeographicSecurityEnabled] = useState(false);
  const [suspiciousActivityDetection, setSuspiciousActivityDetection] = useState(true);
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState<IPWhitelistEntry[]>([]);
  const [newIp, setNewIp] = useState('');
  const [newIpLabel, setNewIpLabel] = useState('');
  const [currentLocation, setCurrentLocation] = useState<string>('');

  useEffect(() => {
    loadProtectionSettings();
    loadIPWhitelist();
    detectCurrentLocation();
  }, [userId]);

  const loadProtectionSettings = async () => {
    try {
      // Token is in httpOnly cookie - no need to send Authorization header
      const response = await fetch('/api/auth/security/protection', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRecaptchaEnabled(data.recaptchaEnabled || false);
        setGeographicSecurityEnabled(data.geographicSecurityEnabled || false);
        setSuspiciousActivityDetection(data.suspiciousActivityDetection !== false);
        setIpWhitelistEnabled(data.ipWhitelistEnabled || false);
      }
    } catch (error) {
      logger.error('Error loading protection settings:', error);
    }
  };

  const loadIPWhitelist = async () => {
    try {
      // Token is in httpOnly cookie - no need to send Authorization header
      const response = await fetch('/api/auth/security/ip-whitelist', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setIpWhitelist(data.ips || []);
      }
    } catch (error) {
      logger.error('Error loading IP whitelist:', error);
    }
  };

  const detectCurrentLocation = async () => {
    try {
      // Use a geolocation service or IP-based location detection
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        setCurrentLocation(`${data.city || ''}, ${data.country_name || ''}`);
      }
    } catch (error) {
      logger.error('Error detecting location:', error);
    }
  };

  const handleSaveProtectionSettings = async () => {
    try {
      // Token is in httpOnly cookie - no need to send Authorization header
      const response = await fetch('/api/auth/security/protection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          recaptchaEnabled,
          geographicSecurityEnabled,
          suspiciousActivityDetection,
          ipWhitelistEnabled,
        }),
      });

      if (response.ok) {
        toast.success('تم حفظ إعدادات الحماية');
      } else {
        toast.error('فشل في حفظ الإعدادات');
      }
    } catch (error) {
      logger.error('Error saving protection settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  const handleAddIP = async () => {
    if (!newIp) {
      toast.error('الرجاء إدخال عنوان IP');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newIp)) {
      toast.error('عنوان IP غير صحيح');
      return;
    }

    try {
      // Token is in httpOnly cookie - no need to send Authorization header
      const response = await fetch('/api/auth/security/ip-whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ip: newIp,
          label: newIpLabel || 'عنوان IP',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIpWhitelist([...ipWhitelist, data.ip]);
        setNewIp('');
        setNewIpLabel('');
        toast.success('تم إضافة عنوان IP إلى القائمة البيضاء');
      } else {
        toast.error('فشل في إضافة عنوان IP');
      }
    } catch (error) {
      logger.error('Error adding IP:', error);
      toast.error('حدث خطأ أثناء إضافة عنوان IP');
    }
  };

  const handleRemoveIP = async (ipId: string) => {
    try {
      // Token is in httpOnly cookie - no need to send Authorization header
      const response = await fetch(`/api/auth/security/ip-whitelist/${ipId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setIpWhitelist(ipWhitelist.filter(ip => ip.id !== ipId));
        toast.success('تم إزالة عنوان IP من القائمة البيضاء');
      } else {
        toast.error('فشل في إزالة عنوان IP');
      }
    } catch (error) {
      logger.error('Error removing IP:', error);
      toast.error('حدث خطأ أثناء إزالة عنوان IP');
    }
  };

  return (
    <div className="space-y-6">
      {/* Google reCAPTCHA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Google reCAPTCHA
          </CardTitle>
          <CardDescription>
            حماية حسابك من الروبوتات والهجمات التلقائية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">تفعيل reCAPTCHA</Label>
                <p className="text-sm text-muted-foreground">
                  يتطلب التحقق من reCAPTCHA عند تسجيل الدخول
                </p>
              </div>
            </div>
            <Switch
              checked={recaptchaEnabled}
              onCheckedChange={setRecaptchaEnabled}
            />
          </div>

          {recaptchaEnabled && (
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
              <div className="text-sm text-center py-4">تم التحقق بنجاح</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geographic Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            أمان الموقع الجغرافي
          </CardTitle>
          <CardDescription>
            تحديد الموقع الجغرافي المسموح لتسجيل الدخول
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">تفعيل أمان الموقع الجغرافي</Label>
                <p className="text-sm text-muted-foreground">
                  {currentLocation && `الموقع الحالي: ${currentLocation}`}
                </p>
              </div>
            </div>
            <Switch
              checked={geographicSecurityEnabled}
              onCheckedChange={setGeographicSecurityEnabled}
            />
          </div>

          {geographicSecurityEnabled && (
            <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">تنبيه:</p>
                  <p>عند تفعيل هذه الميزة، سيتم إرسال تنبيه عند محاولة تسجيل الدخول من موقع جغرافي جديد أو غير معتاد.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspicious Activity Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            كشف النشاط المشبوه
          </CardTitle>
          <CardDescription>
            مراقبة واكتشاف الأنشطة غير العادية على حسابك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">تفعيل كشف النشاط المشبوه</Label>
                <p className="text-sm text-muted-foreground">
                  سيتم اكتشاف وإرسال تنبيهات عند اكتشاف نشاط غير عادي
                </p>
              </div>
            </div>
            <Switch
              checked={suspiciousActivityDetection}
              onCheckedChange={setSuspiciousActivityDetection}
            />
          </div>

          {suspiciousActivityDetection && (
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
              <h3 className="font-medium mb-2">ما يتم مراقبته:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                <li>محاولات تسجيل دخول متعددة فاشلة</li>
                <li>تسجيل دخول من مواقع جغرافية غير معتادة</li>
                <li>تسجيل دخول من أجهزة غير معروفة</li>
                <li>أنشطة غير عادية على الحساب</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IP Whitelisting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            IP Whitelisting
          </CardTitle>
          <CardDescription>
            تحديد عناوين IP المسموح لها بتسجيل الدخول إلى حسابك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">تفعيل IP Whitelisting</Label>
                <p className="text-sm text-muted-foreground">
                  سيتم السماح بتسجيل الدخول فقط من عناوين IP المضافة
                </p>
              </div>
            </div>
            <Switch
              checked={ipWhitelistEnabled}
              onCheckedChange={setIpWhitelistEnabled}
            />
          </div>

          {ipWhitelistEnabled && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">تحذير:</p>
                    <p>عند تفعيل هذه الميزة، سيتم حظر جميع محاولات تسجيل الدخول من عناوين IP غير موجودة في القائمة البيضاء. تأكد من إضافة عنوان IP الحالي قبل التفعيل.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="عنوان IP (مثال: 192.168.1.1)"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="تسمية (اختياري)"
                    value={newIpLabel}
                    onChange={(e) => setNewIpLabel(e.target.value)}
                    className="w-40"
                  />
                  <Button onClick={handleAddIP}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-medium">عناوين IP المسموحة:</h3>
                {ipWhitelist.length > 0 ? (
                  <div className="space-y-2">
                    {ipWhitelist.map((ip) => (
                      <div
                        key={ip.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{ip.ip}</span>
                            {ip.label && (
                              <Badge variant="outline">{ip.label}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            أضيف في: {new Date(ip.createdAt).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveIP(ip.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد عناوين IP في القائمة البيضاء
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveProtectionSettings}>
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}

