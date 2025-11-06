'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Button } from "@/shared/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/shared/badge";
import { toast } from 'sonner';
import { Shield, Smartphone, Key, Copy, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TOTPSetup } from '@/components/auth/TOTPSetup';
import RecoveryCodesDisplay from '@/components/auth/RecoveryCodesDisplay';

interface TwoFactorAuthProps {
  userId: string;
}

type TwoFactorMethod = 'totp' | 'recovery' | null;

export default function TwoFactorAuth({ userId }: TwoFactorAuthProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupMethod, setSetupMethod] = useState<TwoFactorMethod>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    load2FAStatus();
  }, [userId]);

  const load2FAStatus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch('/api/auth/two-factor', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.enabled || false);
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupTOTP = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch('/api/auth/two-factor/totp/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTotpSecret(data.secret);
        setQrCode(data.qrCode);
        setSetupMethod('totp');
      } else {
        toast.error('فشل في إعداد TOTP');
      }
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      toast.error('حدث خطأ أثناء إعداد TOTP');
    }
  };

  const handleVerifyTOTP = async (code: string) => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch('/api/auth/two-factor/totp/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsEnabled(true);
        setSetupMethod(null);
        if (data.recoveryCodes) {
          setRecoveryCodes(data.recoveryCodes);
          setShowRecoveryCodes(true);
        }
        toast.success('تم تفعيل المصادقة الثنائية بنجاح');
      } else {
        const error = await response.json();
        toast.error(error.error || 'رمز التحقق غير صحيح');
      }
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      toast.error('حدث خطأ أثناء التحقق');
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('هل أنت متأكد من تعطيل المصادقة الثنائية؟ هذا سيقلل من أمان حسابك.')) {
      return;
    }

    try {
      const code = prompt('أدخل رمز التحقق من تطبيق المصادقة لإلغاء التفعيل:');
      if (!code) return;

      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch('/api/auth/two-factor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'disable', code }),
      });

      if (response.ok) {
        setIsEnabled(false);
        setRecoveryCodes([]);
        setShowRecoveryCodes(false);
        toast.success('تم تعطيل المصادقة الثنائية');
      } else {
        const error = await response.json();
        toast.error(error.error || 'فشل في تعطيل المصادقة الثنائية');
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error('حدث خطأ أثناء تعطيل المصادقة الثنائية');
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch('/api/auth/two-factor/recovery-codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecoveryCodes(data.recoveryCodes);
        setShowRecoveryCodes(true);
        toast.success('تم إنشاء رموز الاسترداد الجديدة');
      } else {
        toast.error('فشل في إنشاء رموز الاسترداد');
      }
    } catch (error) {
      console.error('Error generating recovery codes:', error);
      toast.error('حدث خطأ أثناء إنشاء رموز الاسترداد');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            المصادقة الثنائية (2FA)
          </CardTitle>
          <CardDescription>
            أضف طبقة إضافية من الأمان إلى حسابك باستخدام تطبيق المصادقة أو رموز الاسترداد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">المصادقة الثنائية</Label>
                <p className="text-sm text-muted-foreground">
                  {isEnabled 
                    ? 'المصادقة الثنائية مفعلة - حسابك محمي بشكل أفضل'
                    : 'فعّل المصادقة الثنائية لزيادة أمان حسابك'}
                </p>
              </div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => {
                if (checked && !isEnabled) {
                  handleSetupTOTP();
                } else if (!checked && isEnabled) {
                  handleDisable2FA();
                }
              }}
              disabled={isLoading}
            />
          </div>

          {!isEnabled && setupMethod === 'totp' && totpSecret && qrCode && (
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                إعداد تطبيق المصادقة (TOTP)
              </h3>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48 border rounded-lg" />
                </div>
                <div className="text-sm space-y-2">
                  <p className="font-medium">خطوات الإعداد:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>افتح تطبيق المصادقة على جهازك (Google Authenticator، Microsoft Authenticator، إلخ)</li>
                    <li>امسح رمز QR أعلاه أو أدخل المفتاح يدوياً</li>
                    <li>أدخل رمز التحقق المكون من 6 أرقام من التطبيق</li>
                  </ol>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono">{totpSecret}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(totpSecret);
                        toast.success('تم نسخ المفتاح');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="أدخل رمز التحقق المكون من 6 أرقام"
                    maxLength={6}
                    onChange={(e) => {
                      if (e.target.value.length === 6) {
                        handleVerifyTOTP(e.target.value);
                      }
                    }}
                    className="text-center text-2xl tracking-widest"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => {
                      const code = prompt('أدخل رمز التحقق:');
                      if (code) handleVerifyTOTP(code);
                    }}>
                      التحقق
                    </Button>
                    <Button variant="outline" onClick={() => setSetupMethod(null)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isEnabled && (
            <>
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-800 dark:text-green-200 mb-1">
                      المصادقة الثنائية مفعلة
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      تمت إضافة طبقة أمان إضافية إلى حسابك. سيتم طلب رمز التحقق من تطبيق المصادقة عند كل تسجيل دخول من جهاز جديد.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    رموز الاسترداد
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    رموز الاسترداد يمكن استخدامها مرة واحدة فقط في حالة فقدان جهاز المصادقة. احفظها في مكان آمن.
                  </p>
                  
                  {showRecoveryCodes && recoveryCodes.length > 0 ? (
                    <RecoveryCodesDisplay
                      codes={recoveryCodes}
                      onCopy={() => toast.success('تم نسخ الرموز')}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleGenerateRecoveryCodes}
                      >
                        <RefreshCw className="h-4 w-4 ml-2" />
                        إنشاء رموز استرداد جديدة
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Load existing recovery codes
                          handleGenerateRecoveryCodes();
                        }}
                      >
                        عرض رموز الاسترداد الحالية
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={handleDisable2FA}
                  >
                    تعطيل المصادقة الثنائية
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

